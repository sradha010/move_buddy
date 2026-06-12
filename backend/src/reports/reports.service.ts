import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

export type ReportStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';

export interface ResolveReportDto {
  /** New status to set — typically 'resolved' or 'dismissed' */
  status: ReportStatus;
  /** Optional admin note stored in description / audit log */
  resolution_note?: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Create Report ────────────────────────────────────────────────────────────

  async create(reporterId: string, dto: CreateReportDto) {
    // 1. At least one target must be supplied
    if (!dto.reported_user_id && !dto.reported_ride_id) {
      throw new BadRequestException(
        'You must provide at least one of reported_user_id or reported_ride_id.',
      );
    }

    // 2. Reporter cannot report themselves
    if (dto.reported_user_id && dto.reported_user_id === reporterId) {
      throw new ForbiddenException('You cannot submit a report against yourself.');
    }

    // 3. Optionally validate the target user exists
    if (dto.reported_user_id) {
      const targetUser = await this.prisma.user.findUnique({
        where: { id: dto.reported_user_id },
        select: { id: true },
      });

      if (!targetUser) {
        throw new NotFoundException(
          `User '${dto.reported_user_id}' not found.`,
        );
      }
    }

    // 4. Optionally validate the target ride exists
    if (dto.reported_ride_id) {
      const targetRide = await this.prisma.ride.findUnique({
        where: { id: dto.reported_ride_id },
        select: { id: true },
      });

      if (!targetRide) {
        throw new NotFoundException(
          `Ride '${dto.reported_ride_id}' not found.`,
        );
      }
    }

    // 5. Persist the report
    const report = await this.prisma.report.create({
      data: {
        reporter_id: reporterId,
        reported_user_id: dto.reported_user_id ?? null,
        reported_ride_id: dto.reported_ride_id ?? null,
        reason: dto.reason,
        description: dto.description ?? null,
        status: 'open',
      },
      include: {
        reporter: {
          select: { id: true, name: true, phone: true },
        },
        reported_user: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    this.logger.log(
      `Report created: id=${report.id}, reporter=${reporterId}, ` +
        `reported_user=${dto.reported_user_id ?? 'N/A'}, ` +
        `reported_ride=${dto.reported_ride_id ?? 'N/A'}`,
    );

    return report;
  }

  // ─── Get Reports Made by a User ───────────────────────────────────────────────

  async getMyReports(userId: string) {
    const reports = await this.prisma.report.findMany({
      where: { reporter_id: userId },
      include: {
        reported_user: {
          select: { id: true, name: true, profile_photo: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return { total: reports.length, reports };
  }

  // ─── Get All Reports (admin) ──────────────────────────────────────────────────

  async getAllReports(
    page: number = 1,
    limit: number = 20,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [reports, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, name: true, phone: true, profile_photo: true },
          },
          reported_user: {
            select: { id: true, name: true, phone: true, profile_photo: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      reports,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  // ─── Resolve Report (admin) ───────────────────────────────────────────────────

  async resolveReport(
    reportId: string,
    adminId: string,
    resolution: ResolveReportDto,
  ) {
    // 1. Load the report
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException(`Report '${reportId}' not found.`);
    }

    if (report.status === 'resolved' || report.status === 'dismissed') {
      throw new BadRequestException(
        `Report is already '${report.status}' and cannot be updated.`,
      );
    }

    const now = new Date();

    // 2. Update the report status in a transaction alongside an audit log entry
    const [updatedReport] = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.report.update({
        where: { id: reportId },
        data: {
          status: resolution.status,
          resolved_by: adminId,
          resolved_at: now,
          ...(resolution.resolution_note && {
            description:
              (report.description ? report.description + '\n\n' : '') +
              `[Admin resolution] ${resolution.resolution_note}`,
          }),
        },
        include: {
          reporter: {
            select: { id: true, name: true, phone: true },
          },
          reported_user: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          user_id: adminId,
          action: `report_${resolution.status}`,
          entity_type: 'Report',
          entity_id: reportId,
          old_value: { status: report.status },
          new_value: {
            status: resolution.status,
            resolved_by: adminId,
            resolved_at: now.toISOString(),
            resolution_note: resolution.resolution_note ?? null,
          },
        },
      });

      return [updated];
    });

    this.logger.log(
      `Report resolved: id=${reportId}, admin=${adminId}, status=${resolution.status}`,
    );

    return updatedReport;
  }
}
