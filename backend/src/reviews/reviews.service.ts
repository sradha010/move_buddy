import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Create Review ────────────────────────────────────────────────────────────

  async create(reviewerId: string, dto: CreateReviewDto) {
    // 1. Verify reviewer and reviewee are not the same person
    if (reviewerId === dto.reviewee_id) {
      throw new BadRequestException('You cannot review yourself.');
    }

    // 2. Fetch the ride and verify it is completed
    const ride = await this.prisma.ride.findUnique({
      where: { id: dto.ride_id },
      include: {
        requests: {
          where: {
            status: 'accepted',
          },
          select: { guest_id: true },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException(`Ride '${dto.ride_id}' not found.`);
    }

    if (ride.status !== 'completed') {
      throw new BadRequestException(
        'Reviews can only be submitted for completed rides.',
      );
    }

    // 3. Verify reviewer participated in the ride (was host or accepted guest)
    const isHost = ride.host_id === reviewerId;
    const isAcceptedGuest = ride.requests.some(
      (r) => r.guest_id === reviewerId,
    );

    if (!isHost && !isAcceptedGuest) {
      throw new ForbiddenException(
        'You did not participate in this ride and cannot leave a review.',
      );
    }

    // 4. Verify reviewee also participated in the ride
    const revieweeIsHost = ride.host_id === dto.reviewee_id;
    const revieweeIsGuest = ride.requests.some(
      (r) => r.guest_id === dto.reviewee_id,
    );

    if (!revieweeIsHost && !revieweeIsGuest) {
      throw new BadRequestException(
        'The user you are trying to review did not participate in this ride.',
      );
    }

    // 5. Check for duplicate review (unique constraint on [ride_id, reviewer_id])
    const existingReview = await this.prisma.review.findUnique({
      where: {
        ride_id_reviewer_id: {
          ride_id: dto.ride_id,
          reviewer_id: reviewerId,
        },
      },
    });

    if (existingReview) {
      throw new ConflictException(
        'You have already submitted a review for this ride.',
      );
    }

    // 6. Create the review
    const review = await this.prisma.review.create({
      data: {
        ride_id: dto.ride_id,
        reviewer_id: reviewerId,
        reviewee_id: dto.reviewee_id,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
      include: {
        reviewer: {
          select: { id: true, name: true, profile_photo: true },
        },
        reviewee: {
          select: { id: true, name: true, profile_photo: true },
        },
        ride: {
          select: {
            id: true,
            origin_address: true,
            destination_address: true,
            departure_time: true,
          },
        },
      },
    });

    this.logger.log(
      `Review created: id=${review.id}, reviewer=${reviewerId}, reviewee=${dto.reviewee_id}, ride=${dto.ride_id}`,
    );

    // 7. Update reviewee's average rating in background (non-blocking for response)
    await this.updateUserAverageRating(dto.reviewee_id);

    return review;
  }

  // ─── Get Reviews for a User (received) ───────────────────────────────────────

  async getReviewsForUser(userId: string) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new NotFoundException(`User '${userId}' not found.`);
    }

    const reviews = await this.prisma.review.findMany({
      where: { reviewee_id: userId },
      include: {
        reviewer: {
          select: { id: true, name: true, profile_photo: true },
        },
        ride: {
          select: {
            id: true,
            origin_address: true,
            destination_address: true,
            departure_time: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const averageRating = await this.getUserAverageRating(userId);

    return {
      user: { id: user.id, name: user.name },
      average_rating: averageRating,
      total_reviews: reviews.length,
      reviews,
    };
  }

  // ─── Get Reviews for a Ride ───────────────────────────────────────────────────

  async getRideReviews(rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: {
        id: true,
        origin_address: true,
        destination_address: true,
        departure_time: true,
        status: true,
      },
    });

    if (!ride) {
      throw new NotFoundException(`Ride '${rideId}' not found.`);
    }

    const reviews = await this.prisma.review.findMany({
      where: { ride_id: rideId },
      include: {
        reviewer: {
          select: { id: true, name: true, profile_photo: true },
        },
        reviewee: {
          select: { id: true, name: true, profile_photo: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return { ride, total_reviews: reviews.length, reviews };
  }

  // ─── Get User Average Rating ──────────────────────────────────────────────────

  async getUserAverageRating(
    userId: string,
  ): Promise<number | null> {
    const result = await this.prisma.review.aggregate({
      where: { reviewee_id: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    if (result._count.rating === 0) {
      return null;
    }

    return Math.round((result._avg.rating ?? 0) * 100) / 100;
  }

  // ─── Internal: Recompute and persist average rating on user record ────────────

  private async updateUserAverageRating(userId: string): Promise<void> {
    // User model does not have a dedicated avg_rating column in the current
    // schema, so we log the computed value.  If the column is added later,
    // replace the log with a prisma.user.update call.
    const avg = await this.getUserAverageRating(userId);

    this.logger.log(
      `Recomputed average rating for user ${userId}: ${avg ?? 'no reviews yet'}`,
    );
  }
}
