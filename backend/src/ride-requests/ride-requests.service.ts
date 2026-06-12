import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RequestStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MapsService } from '../maps/maps.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RideRequestsService {
  private readonly logger = new Logger(RideRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapsService: MapsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Create / Submit request ──────────────────────────────────────────────────

  async createRequest(guestId: string, dto: CreateRequestDto) {
    // 1. Load ride
    const ride = await this.prisma.ride.findUnique({
      where: { id: dto.ride_id },
    });

    if (!ride || ride.status !== 'open') {
      throw new NotFoundException(
        `Ride '${dto.ride_id}' was not found or is no longer accepting requests.`,
      );
    }

    // 2. Guest must not be the host
    if (ride.host_id === guestId) {
      throw new BadRequestException(
        'You cannot request to join your own ride.',
      );
    }

    // 3. Prevent duplicate requests
    const existingRequest = await this.prisma.rideRequest.findFirst({
      where: {
        ride_id: dto.ride_id,
        guest_id: guestId,
        status: { in: ['pending', 'accepted'] },
      },
    });

    if (existingRequest) {
      throw new ConflictException(
        'You already have an active request for this ride.',
      );
    }

    // 4. Calculate fare
    let fare: number | null = null;
    const hasCustomCoords =
      dto.pickup_lat !== undefined &&
      dto.pickup_lng !== undefined &&
      dto.dropoff_lat !== undefined &&
      dto.dropoff_lng !== undefined;

    if (hasCustomCoords) {
      // Use price_per_km × distance between guest's pickup and dropoff
      const route = await this.mapsService.getRoute(
        dto.pickup_lat!,
        dto.pickup_lng!,
        dto.dropoff_lat!,
        dto.dropoff_lng!,
      );
      fare = Math.round(ride.price_per_km * route.distance_km * 100) / 100;
    } else {
      // Fall back to ride's total price
      fare = ride.total_price;
    }

    // 5. Calculate route overlap
    let route_overlap_pct: number | null = null;
    if (hasCustomCoords) {
      const overlapResult = await this.mapsService.calculateRouteOverlap(
        {
          originLat: ride.origin_lat,
          originLng: ride.origin_lng,
          destLat: ride.destination_lat,
          destLng: ride.destination_lng,
        },
        { lat: dto.pickup_lat!, lng: dto.pickup_lng! },
        { lat: dto.dropoff_lat!, lng: dto.dropoff_lng! },
      );
      route_overlap_pct = overlapResult.overlap_percentage;
    }

    // 6. Persist request
    const request = await this.prisma.rideRequest.create({
      data: {
        ride_id: dto.ride_id,
        guest_id: guestId,
        pickup_address: dto.pickup_address ?? null,
        pickup_lat: dto.pickup_lat ?? null,
        pickup_lng: dto.pickup_lng ?? null,
        dropoff_address: dto.dropoff_address ?? null,
        dropoff_lat: dto.dropoff_lat ?? null,
        dropoff_lng: dto.dropoff_lng ?? null,
        route_overlap_pct,
        fare,
        status: RequestStatus.pending,
      },
      include: {
        guest: {
          select: { id: true, name: true, phone: true, profile_photo: true },
        },
        ride: {
          select: { id: true, origin_address: true, destination_address: true, departure_time: true },
        },
      },
    });

    this.logger.log(
      `RideRequest created: id=${request.id}, ride=${dto.ride_id}, guest=${guestId}`,
    );

    // 7. Notify host
    try {
      await this.notificationsService.create(
        guestId,
        ride.host_id,
        NotificationType.ride_requested,
        'New ride request',
        `${request.guest.name} has requested to join your ride.`,
        { request_id: request.id, ride_id: ride.id },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to send ride_requested notification: ${(err as Error).message}`,
      );
    }

    return request;
  }

  // ─── Accept request ───────────────────────────────────────────────────────────

  async acceptRequest(rideId: string, requestId: string, hostId: string) {
    // 1. Load & authorise ride
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) {
      throw new NotFoundException(`Ride '${rideId}' not found.`);
    }

    if (ride.host_id !== hostId) {
      throw new ForbiddenException('You are not the host of this ride.');
    }

    // 2. Load & validate request
    const rideRequest = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        guest: { select: { id: true, name: true } },
      },
    });

    if (!rideRequest || rideRequest.ride_id !== rideId) {
      throw new NotFoundException(
        `Request '${requestId}' not found for ride '${rideId}'.`,
      );
    }

    if (rideRequest.status !== RequestStatus.pending) {
      throw new BadRequestException(
        `Request is already '${rideRequest.status}' and cannot be accepted.`,
      );
    }

    // 3. Seat availability
    if (ride.available_seats < 1) {
      throw new BadRequestException('Ride is full — no available seats remain.');
    }

    // 4. Accept request + decrement seats in a transaction
    const newAvailableSeats = ride.available_seats - 1;
    const rideIsFull = newAvailableSeats === 0;

    const [updatedRequest] = await this.prisma.$transaction(async (tx) => {
      const accepted = await tx.rideRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.accepted },
        include: {
          guest: { select: { id: true, name: true, phone: true, profile_photo: true } },
          ride: { select: { id: true, origin_address: true, destination_address: true, departure_time: true } },
        },
      });

      await tx.ride.update({
        where: { id: rideId },
        data: {
          available_seats: newAvailableSeats,
          ...(rideIsFull && { status: 'full' }),
        },
      });

      // Reject all other pending requests when ride becomes full
      if (rideIsFull) {
        await tx.rideRequest.updateMany({
          where: {
            ride_id: rideId,
            status: RequestStatus.pending,
            id: { not: requestId },
          },
          data: { status: RequestStatus.rejected },
        });
      }

      return [accepted];
    });

    this.logger.log(
      `RideRequest accepted: id=${requestId}, ride=${rideId}, host=${hostId}`,
    );

    // 5. Notify guest
    try {
      await this.notificationsService.create(
        hostId,
        updatedRequest.guest.id,
        NotificationType.ride_accepted,
        'Ride request accepted',
        'Your ride request has been accepted. Have a great journey!',
        { request_id: requestId, ride_id: rideId },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to send ride_accepted notification: ${(err as Error).message}`,
      );
    }

    return updatedRequest;
  }

  // ─── Reject request ───────────────────────────────────────────────────────────

  async rejectRequest(rideId: string, requestId: string, hostId: string) {
    // 1. Load & authorise ride
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) {
      throw new NotFoundException(`Ride '${rideId}' not found.`);
    }

    if (ride.host_id !== hostId) {
      throw new ForbiddenException('You are not the host of this ride.');
    }

    // 2. Load & validate request
    const rideRequest = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        guest: { select: { id: true, name: true } },
      },
    });

    if (!rideRequest || rideRequest.ride_id !== rideId) {
      throw new NotFoundException(
        `Request '${requestId}' not found for ride '${rideId}'.`,
      );
    }

    if (rideRequest.status !== RequestStatus.pending) {
      throw new BadRequestException(
        `Request is already '${rideRequest.status}' and cannot be rejected.`,
      );
    }

    // 3. Reject
    const updatedRequest = await this.prisma.rideRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.rejected },
      include: {
        guest: { select: { id: true, name: true, phone: true, profile_photo: true } },
        ride: { select: { id: true, origin_address: true, destination_address: true, departure_time: true } },
      },
    });

    this.logger.log(
      `RideRequest rejected: id=${requestId}, ride=${rideId}, host=${hostId}`,
    );

    // 4. Notify guest
    try {
      await this.notificationsService.create(
        hostId,
        rideRequest.guest.id,
        NotificationType.ride_rejected,
        'Ride request rejected',
        'Unfortunately, the host has declined your ride request.',
        { request_id: requestId, ride_id: rideId },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to send ride_rejected notification: ${(err as Error).message}`,
      );
    }

    return updatedRequest;
  }

  // ─── Cancel request (guest) ───────────────────────────────────────────────────

  async cancelRequest(requestId: string, guestId: string) {
    // 1. Load & authorise request
    const rideRequest = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
    });

    if (!rideRequest) {
      throw new NotFoundException(`Request '${requestId}' not found.`);
    }

    if (rideRequest.guest_id !== guestId) {
      throw new ForbiddenException(
        'You do not have permission to cancel this request.',
      );
    }

    // 2. Only cancellable when pending or accepted
    if (
      rideRequest.status !== RequestStatus.pending &&
      rideRequest.status !== RequestStatus.accepted
    ) {
      throw new BadRequestException(
        `Request with status '${rideRequest.status}' cannot be cancelled.`,
      );
    }

    const wasAccepted = rideRequest.status === RequestStatus.accepted;

    // 3. Cancel (restore seat if was accepted)
    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.rideRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.cancelled },
        include: {
          ride: { select: { id: true, origin_address: true, destination_address: true, departure_time: true } },
        },
      });

      if (wasAccepted) {
        // Re-open a seat and revert to 'open' if ride was 'full'
        const ride = await tx.ride.findUnique({
          where: { id: rideRequest.ride_id },
          select: { available_seats: true, status: true, total_seats: true },
        });

        if (ride) {
          const newAvailableSeats = ride.available_seats + 1;
          await tx.ride.update({
            where: { id: rideRequest.ride_id },
            data: {
              available_seats: newAvailableSeats,
              ...(ride.status === 'full' && { status: 'open' }),
            },
          });
        }
      }

      return cancelled;
    });

    this.logger.log(
      `RideRequest cancelled: id=${requestId}, guest=${guestId}, wasAccepted=${wasAccepted}`,
    );

    return updatedRequest;
  }

  // ─── Get all requests for a ride (host only) ──────────────────────────────────

  async getRequestsForRide(rideId: string, hostId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });

    if (!ride) {
      throw new NotFoundException(`Ride '${rideId}' not found.`);
    }

    if (ride.host_id !== hostId) {
      throw new ForbiddenException(
        'Only the host can view requests for this ride.',
      );
    }

    return this.prisma.rideRequest.findMany({
      where: { ride_id: rideId },
      include: {
        guest: {
          select: { id: true, name: true, phone: true, profile_photo: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ─── Get all requests by a guest ──────────────────────────────────────────────

  async getGuestRequests(guestId: string) {
    return this.prisma.rideRequest.findMany({
      where: { guest_id: guestId },
      include: {
        ride: {
          select: {
            id: true,
            origin_address: true,
            destination_address: true,
            departure_time: true,
            status: true,
            host: {
              select: { id: true, name: true, phone: true, profile_photo: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ─── Get status of a specific request ────────────────────────────────────────

  async getRequestStatus(requestId: string, userId: string) {
    const rideRequest = await this.prisma.rideRequest.findUnique({
      where: { id: requestId },
      include: {
        ride: {
          select: {
            id: true,
            host_id: true,
            origin_address: true,
            destination_address: true,
            departure_time: true,
            status: true,
          },
        },
        guest: {
          select: { id: true, name: true, phone: true, profile_photo: true },
        },
      },
    });

    if (!rideRequest) {
      throw new NotFoundException(`Request '${requestId}' not found.`);
    }

    // Only the guest who made the request or the ride host may view it
    const isGuest = rideRequest.guest_id === userId;
    const isHost = rideRequest.ride.host_id === userId;

    if (!isGuest && !isHost) {
      throw new ForbiddenException(
        'You do not have permission to view this request.',
      );
    }

    return rideRequest;
  }
}
