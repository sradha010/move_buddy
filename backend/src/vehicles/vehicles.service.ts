import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { VehicleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ───────────────────────────────────────────────────────────────────

  async create(ownerId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { vehicle_number: dto.vehicle_number },
    });

    if (existing) {
      throw new ConflictException(
        `Vehicle with registration number '${dto.vehicle_number}' is already registered.`,
      );
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        owner_id: ownerId,
        vehicle_type: dto.vehicle_type,
        vehicle_number: dto.vehicle_number,
        vehicle_model: dto.vehicle_model,
        vehicle_color: dto.vehicle_color,
      },
    });

    this.logger.log(
      `Vehicle created: id=${vehicle.id}, owner=${ownerId}, number=${vehicle.vehicle_number}`,
    );

    return vehicle;
  }

  // ─── Find all active vehicles for owner ───────────────────────────────────────

  async findAllByOwner(ownerId: string) {
    return this.prisma.vehicle.findMany({
      where: {
        owner_id: ownerId,
        status: VehicleStatus.active,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ─── Find vehicle by id (with ownership check) ────────────────────────────────

  async findById(id: string, ownerId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id '${id}' not found.`);
    }

    if (vehicle.owner_id !== ownerId) {
      throw new ForbiddenException(
        'You do not have permission to access this vehicle.',
      );
    }

    return vehicle;
  }

  // ─── Find vehicle by id (no ownership check — used internally / admin) ───────

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            profile_photo: true,
            role: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle with id '${id}' not found.`);
    }

    return vehicle;
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  async update(id: string, ownerId: string, dto: UpdateVehicleDto) {
    await this.findById(id, ownerId);

    // If the caller is changing vehicle_number, check uniqueness against other records
    if (dto.vehicle_number) {
      const conflict = await this.prisma.vehicle.findFirst({
        where: {
          vehicle_number: dto.vehicle_number,
          NOT: { id },
        },
      });

      if (conflict) {
        throw new ConflictException(
          `Vehicle with registration number '${dto.vehicle_number}' is already registered.`,
        );
      }
    }

    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(dto.vehicle_type && { vehicle_type: dto.vehicle_type }),
        ...(dto.vehicle_number && { vehicle_number: dto.vehicle_number }),
        ...(dto.vehicle_model && { vehicle_model: dto.vehicle_model }),
        ...(dto.vehicle_color && { vehicle_color: dto.vehicle_color }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    this.logger.log(`Vehicle updated: id=${id}, owner=${ownerId}`);

    return updated;
  }

  // ─── Soft delete (set status to inactive) ────────────────────────────────────

  async remove(id: string, ownerId: string) {
    await this.findById(id, ownerId);

    const deactivated = await this.prisma.vehicle.update({
      where: { id },
      data: { status: VehicleStatus.inactive },
    });

    this.logger.log(`Vehicle deactivated: id=${id}, owner=${ownerId}`);

    return {
      message: `Vehicle '${deactivated.vehicle_number}' has been deactivated successfully.`,
      vehicle: deactivated,
    };
  }
}
