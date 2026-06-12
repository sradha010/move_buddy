import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ─── POST /reviews ────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a review',
    description:
      'Allows a ride participant (host or accepted guest) to review another ' +
      'participant of the same completed ride. Each participant may only submit ' +
      'one review per ride.',
  })
  @ApiResponse({ status: 201, description: 'Review created successfully.' })
  @ApiResponse({
    status: 400,
    description:
      'Ride not completed, reviewer === reviewee, or reviewee did not participate.',
  })
  @ApiResponse({
    status: 403,
    description: 'Reviewer did not participate in the ride.',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate review — already reviewed this ride.',
  })
  async createReview(
    @CurrentUser('id') reviewerId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(reviewerId, dto);
  }

  // ─── GET /reviews/user/:userId ────────────────────────────────────────────────

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all reviews received by a user',
    description:
      'Returns every review submitted for the specified user, along with their ' +
      'computed average rating and total review count.',
  })
  @ApiParam({ name: 'userId', description: 'UUID of the user' })
  @ApiResponse({
    status: 200,
    description: 'Reviews returned successfully.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getReviewsForUser(@Param('userId', ParseUuidPipe) userId: string) {
    return this.reviewsService.getReviewsForUser(userId);
  }

  // ─── GET /reviews/ride/:rideId ────────────────────────────────────────────────

  @Get('ride/:rideId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all reviews for a ride',
    description:
      'Returns every review associated with the specified ride, including ' +
      'reviewer and reviewee summaries.',
  })
  @ApiParam({ name: 'rideId', description: 'UUID of the ride' })
  @ApiResponse({
    status: 200,
    description: 'Reviews returned successfully.',
  })
  @ApiResponse({ status: 404, description: 'Ride not found.' })
  async getRideReviews(@Param('rideId', ParseUuidPipe) rideId: string) {
    return this.reviewsService.getRideReviews(rideId);
  }
}
