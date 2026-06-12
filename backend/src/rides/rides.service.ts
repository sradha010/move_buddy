import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DocumentStatus, RideStatus, RequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { SearchRideDto } from './dto/search-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';

// Haversine distance in kilometres between two lat/lng pairs
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Allowed host-initiated status transitions */
const ALLOWED_TRANSITIONS: Partial<Record<RideStatus, RideStatus[]>> = {
  [RideStatus.open]: [RideStatus.cancelled],
  [RideStatus.active]: [RideStatus.completed],
};

// Host select shape reused across multiple queries
const HOST_SELECT = {
  id: true,
  name: true,
  phone: true,
  profile_photo: true,
  role: true,
  active_mode: true,
} as const;

@Injectable()
export class RidesService {
  private readonly logger = new Logger(RidesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────────────────────────────────────────

  async create(hostId: string, dto: CreateRideDto) {
    // Verify the host has approved documents
    const doc = await this.prisma.userDocument.findUnique({
      where: { user_id: hostId },
    });

    if (!doc || doc.status !== DocumentStatus.approved) {
      throw new ForbiddenException(
        'Your documents must be approved before you can offer a ride.',
      );
    }

    const total_price = parseFloat(
      (dto.price_per_km * dto.distance_km).toFixed(2),
    );

    const ride = await this.prisma.ride.create({
      data: {
        host_id: hostId,
        vehicle_id: dto.vehicle_id ?? null,
        origin_address: dto.origin_address,
        origin_lat: dto.origin_lat,
        origin_lng: dto.origin_lng,
        destination_address: dto.destination_address,
        destination_lat: dto.destination_lat,
        destination_lng: dto.destination_lng,
        distance_km: dto.distance_km,
        duration_minutes: dto.duration_minutes,
        departure_time: new Date(dto.departure_time),
        price_per_km: dto.price_per_km,
        total_price,
        available_seats: dto.total_seats,
        total_seats: dto.total_seats,
        status: RideStatus.open,
      },
      include: {
        host: { select: HOST_SELECT },
        vehicle: true,
      },
    });

    this.logger.log(
      `Ride created: id=${ride.id}, host=${hostId}, departure=${ride.departure_time}`,
    );

    return ride;
  }

  // ─── Search ───────────────────────────────────────────────────────────────────

  async search(dto: SearchRideDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build the date range filter when departure_date is supplied
    let departureDateFilter: { gte: Date; lt: Date } | undefined;
    if (dto.departure_date) {
      const start = new Date(dto.departure_date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      departureDateFilter = { gte: start, lt: end };
    }

    const rides = await this.prisma.ride.findMany({
      where: {
        status: RideStatus.open,
        departure_time: departureDateFilter ?? { gte: new Date() },
        ...(dto.available_seats !== undefined && {
          available_seats: { gte: dto.available_seats },
        }),
      },
      include: {
        host: { select: HOST_SELECT },
        vehicle: true,
        _count: { select: { requests: true } },
      },
      orderBy: { departure_time: 'asc' },
    });

    // Apply coordinate-based proximity filter in-process (simple 20 km radius)
    const hasOriginCoords =
      dto.origin_lat !== undefined && dto.origin_lng !== undefined;
    const hasDestCoords =
      dto.destination_lat !== undefined && dto.destination_lng !== undefined;

    const PROXIMITY_KM = 20;

    const filtered = rides.filter((ride) => {
      if (
        hasOriginCoords &&
        haversineKm(
          dto.origin_lat!,
          dto.origin_lng!,
          ride.origin_lat,
          ride.origin_lng,
        ) > PROXIMITY_KM
      ) {
        return false;
      }
      if (
        hasDestCoords &&
        haversineKm(
          dto.destination_lat!,
          dto.destination_lng!,
          ride.destination_lat,
          ride.destination_lng,
        ) > PROXIMITY_KM
      ) {
        return false;
      }
      return true;
    });

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    return { rides: paginated, total, page, limit };
  }

  // ─── Find by ID ───────────────────────────────────────────────────────────────

  async findById(id: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id },
      include: {
        host: { select: HOST_SELECT },
        vehicle: true,
        _count: { select: { requests: true } },
      },
    });

    if (!ride) {
      throw new NotFoundException(`Ride with id '${id}' not found.`);
    }

    return ride;
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  async update(id: string, hostId: string, dto: UpdateRideDto) {
    const ride = await this.findById(id);

    if (ride.host_id !== hostId) {
      throw new ForbiddenException(
        'You do not have permission to update this ride.',
      );
    }

    // Validate status transition when the caller is changing status
    if (dto.status !== undefined && dto.status !== ride.status) {
      const allowed = ALLOWED_TRANSITIONS[ride.status] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Invalid status transition: '${ride.status}' → '${dto.status}'. ` +
            `Allowed transitions from '${ride.status}': ${allowed.join(', ') || 'none'}.`,
        );
      }
    }

    // Recalculate total_price if price_per_km or distance_km changes
    const newPricePerKm = dto.price_per_km ?? ride.price_per_km;
    const newDistanceKm = dto.distance_km ?? ride.distance_km;
    const total_price = parseFloat((newPricePerKm * newDistanceKm).toFixed(2));

    const updated = await this.prisma.ride.update({
      where: { id },
      data: {
        ...(dto.origin_address !== undefined && {
          origin_address: dto.origin_address,
        }),
        ...(dto.destination_address !== undefined && {
          destination_address: dto.destination_address,
        }),
        ...(dto.distance_km !== undefined && { distance_km: dto.distance_km }),
        ...(dto.duration_minutes !== undefined && {
          duration_minutes: dto.duration_minutes,
        }),
        ...(dto.departure_time !== undefined && {
          departure_time: new Date(dto.departure_time),
        }),
        ...(dto.price_per_km !== undefined && {
          price_per_km: dto.price_per_km,
        }),
        total_price,
        ...(dto.total_seats !== undefined && { total_seats: dto.total_seats }),
        ...(dto.vehicle_id !== undefined && { vehicle_id: dto.vehicle_id }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        host: { select: HOST_SELECT },
        vehicle: true,
        _count: { select: { requests: true } },
      },
    });

    this.logger.log(`Ride updated: id=${id}, host=${hostId}`);

    return updated;
  }

  // ─── Remove (soft delete) ─────────────────────────────────────────────────────

  async remove(id: string, hostId: string) {
    const ride = await this.findById(id);

    if (ride.host_id !== hostId) {
      throw new ForbiddenException(
        'You do not have permission to delete this ride.',
      );
    }

    // Prevent cancellation when accepted requests exist
    const acceptedCount = await this.prisma.rideRequest.count({
      where: { ride_id: id, status: RequestStatus.accepted },
    });

    if (acceptedCount > 0) {
      throw new BadRequestException(
        `Cannot cancel a ride that has ${acceptedCount} accepted request(s). ` +
          'Please handle the accepted passengers first.',
      );
    }

    const cancelled = await this.prisma.ride.update({
      where: { id },
      data: { status: RideStatus.cancelled },
    });

    this.logger.log(`Ride cancelled: id=${id}, host=${hostId}`);

    return {
      message: 'Ride has been cancelled successfully.',
      ride: cancelled,
    };
  }

  // ─── Update Available Seats (atomic) ─────────────────────────────────────────

  /**
   * Atomically adjusts `available_seats` by `change` (+1 or -1).
   * Automatically flips status to 'full' when seats reach 0, and back to
   * 'open' when seats become positive again.
   *
   * @param rideId - UUID of the ride to update
   * @param change - +1 to free a seat, -1 to occupy a seat
   */
  async updateAvailableSeats(rideId: string, change: number): Promise<void> {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { available_seats: true, status: true, total_seats: true },
    });

    if (!ride) {
      throw new NotFoundException(`Ride with id '${rideId}' not found.`);
    }

    const newSeats = ride.available_seats + change;

    if (newSeats < 0) {
      throw new BadRequestException('No available seats left on this ride.');
    }

    if (newSeats > ride.total_seats) {
      throw new BadRequestException(
        'Available seats cannot exceed total seats.',
      );
    }

    const newStatus: RideStatus =
      newSeats === 0 ? RideStatus.full : RideStatus.open;

    await this.prisma.ride.update({
      where: { id: rideId },
      data: {
        available_seats: newSeats,
        // Only update status when it transitions between open/full states
        ...(ride.status !== RideStatus.active &&
          ride.status !== RideStatus.completed &&
          ride.status !== RideStatus.cancelled && {
            status: newStatus,
          }),
      },
    });

    this.logger.log(
      `Ride seats updated: id=${rideId}, change=${change}, newSeats=${newSeats}, status=${newStatus}`,
    );
  }

  // ─── Get Host's Rides ─────────────────────────────────────────────────────────

  async getHostRides(hostId: string, status?: RideStatus) {
    const rides = await this.prisma.ride.findMany({
      where: {
        host_id: hostId,
        ...(status !== undefined && { status }),
      },
      include: {
        vehicle: true,
        _count: { select: { requests: true } },
      },
      orderBy: { departure_time: 'desc' },
    });

    return rides;
  }
}
