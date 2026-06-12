import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateBrandingDto } from './dto/update-branding.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Dashboard Stats ──────────────────────────────────────────────────────────

  /**
   * Returns a high-level platform dashboard snapshot.
   */
  async getDashboardStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      total_users,
      total_hosts,
      total_guests,
      active_rides,
      completed_rides_today,
      total_revenue_agg,
      active_subscriptions,
      open_reports,
      users_this_week,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'host' } }),
      this.prisma.user.count({ where: { role: 'guest' } }),
      this.prisma.ride.count({ where: { status: { in: ['open', 'active'] } } }),
      this.prisma.ride.count({
        where: {
          status: 'completed',
          updated_at: { gte: startOfToday },
        },
      }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
      this.prisma.subscription.count({ where: { status: 'active' } }),
      this.prisma.report.count({ where: { status: 'open' } }),
      this.prisma.user.count({
        where: { created_at: { gte: startOfWeek } },
      }),
    ]);

    return {
      total_users,
      total_hosts,
      total_guests,
      active_rides,
      completed_rides_today,
      total_revenue: total_revenue_agg._sum.amount ?? 0,
      active_subscriptions,
      open_reports,
      users_this_week,
    };
  }

  // ─── Users ────────────────────────────────────────────────────────────────────

  /**
   * Returns a paginated, filterable list of users.
   */
  async getUsers(
    page = 1,
    limit = 20,
    search?: string,
    role?: string,
    status?: string,
  ) {
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role as any;
    }

    if (status === 'suspended') {
      where.is_suspended = true;
    } else if (status === 'active') {
      where.is_suspended = false;
    } else if (status === 'verified') {
      where.is_verified = true;
    } else if (status === 'unverified') {
      where.is_verified = false;
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active_mode: true,
          is_verified: true,
          is_suspended: true,
          profile_photo: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      limit: safeLimit,
      total_pages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Suspends a user and writes an audit log entry.
   */
  async suspendUser(userId: string, adminId: string, reason: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id '${userId}' not found.`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { is_suspended: true },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'suspend_user',
          entity_type: 'user',
          entity_id: userId,
          old_value: { is_suspended: user.is_suspended },
          new_value: { reason, is_suspended: true },
        },
      }),
    ]);

    this.logger.log(`User ${userId} suspended by admin ${adminId}. Reason: ${reason}`);
    return updated;
  }

  /**
   * Reactivates a previously suspended user and writes an audit log entry.
   */
  async activateUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id '${userId}' not found.`);
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { is_suspended: false },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'activate_user',
          entity_type: 'user',
          entity_id: userId,
          old_value: { is_suspended: user.is_suspended },
          new_value: { is_suspended: false },
        },
      }),
    ]);

    this.logger.log(`User ${userId} activated by admin ${adminId}.`);
    return updated;
  }

  // ─── Documents ────────────────────────────────────────────────────────────────

  /**
   * Returns paginated user documents that are awaiting review.
   */
  async getPendingDocuments(page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const [documents, total] = await this.prisma.$transaction([
      this.prisma.userDocument.findMany({
        where: { status: 'pending' },
        skip,
        take: safeLimit,
        orderBy: { created_at: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              profile_photo: true,
            },
          },
        },
      }),
      this.prisma.userDocument.count({ where: { status: 'pending' } }),
    ]);

    return {
      documents,
      total,
      page,
      limit: safeLimit,
      total_pages: Math.ceil(total / safeLimit),
    };
  }

  /**
   * Approves a user document, marks the owner as verified, and notifies them.
   */
  async approveDocument(documentId: string, adminId: string) {
    const document = await this.prisma.userDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`Document with id '${documentId}' not found.`);
    }

    const now = new Date();

    const [updatedDoc] = await this.prisma.$transaction([
      this.prisma.userDocument.update({
        where: { id: documentId },
        data: {
          status: 'approved',
          reviewed_by: adminId,
          reviewed_at: now,
          rejection_reason: null,
        },
      }),
      this.prisma.user.update({
        where: { id: document.user_id },
        data: { is_verified: true },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'approve_document',
          entity_type: 'UserDocument',
          entity_id: documentId,
          old_value: { status: document.status },
          new_value: { status: 'approved', reviewed_by: adminId, reviewed_at: now },
        },
      }),
    ]);

    await this.notifications.create(
      null,
      document.user_id,
      NotificationType.otp_sent,
      'Documents Approved',
      'Your submitted documents have been approved. Your account is now verified!',
      { document_id: documentId },
    );

    this.logger.log(`Document ${documentId} approved by admin ${adminId}.`);
    return updatedDoc;
  }

  /**
   * Rejects a user document with a reason and notifies the owner.
   */
  async rejectDocument(documentId: string, adminId: string, reason: string) {
    const document = await this.prisma.userDocument.findUnique({
      where: { id: documentId },
    });
    if (!document) {
      throw new NotFoundException(`Document with id '${documentId}' not found.`);
    }

    const now = new Date();

    const [updatedDoc] = await this.prisma.$transaction([
      this.prisma.userDocument.update({
        where: { id: documentId },
        data: {
          status: 'rejected',
          reviewed_by: adminId,
          reviewed_at: now,
          rejection_reason: reason,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          user_id: adminId,
          action: 'reject_document',
          entity_type: 'UserDocument',
          entity_id: documentId,
          old_value: { status: document.status },
          new_value: { status: 'rejected', rejection_reason: reason, reviewed_by: adminId },
        },
      }),
    ]);

    await this.notifications.create(
      null,
      document.user_id,
      NotificationType.otp_sent,
      'Documents Rejected',
      `Your submitted documents were rejected. Reason: ${reason}. Please re-upload corrected documents.`,
      { document_id: documentId, reason },
    );

    this.logger.log(`Document ${documentId} rejected by admin ${adminId}. Reason: ${reason}`);
    return updatedDoc;
  }

  // ─── Branding ─────────────────────────────────────────────────────────────────

  /**
   * Returns the active branding configuration, seeding defaults if none exists.
   */
  async getBranding() {
    const existing = await this.prisma.branding.findFirst({
      orderBy: { created_at: 'desc' },
    });

    if (existing) {
      return existing;
    }

    this.logger.warn('No Branding record found — seeding defaults.');
    return this.prisma.branding.create({
      data: {
        primary_color: '#FF7D00',
        navbar_links: [],
      },
    });
  }

  /**
   * Upserts the branding configuration and writes an audit log entry.
   */
  async updateBranding(adminId: string, dto: UpdateBrandingDto) {
    const current = await this.getBranding();

    const updated = await this.prisma.branding.update({
      where: { id: current.id },
      data: {
        ...(dto.logo_url !== undefined && { logo_url: dto.logo_url }),
        ...(dto.primary_color !== undefined && { primary_color: dto.primary_color }),
        ...(dto.navbar_links !== undefined && { navbar_links: dto.navbar_links }),
        updated_by: adminId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        user_id: adminId,
        action: 'update_branding',
        entity_type: 'Branding',
        entity_id: current.id,
        old_value: {
          logo_url: current.logo_url,
          primary_color: current.primary_color,
          navbar_links: current.navbar_links,
        },
        new_value: {
          logo_url: updated.logo_url,
          primary_color: updated.primary_color,
          navbar_links: updated.navbar_links,
        },
      },
    });

    this.logger.log(`Branding updated by admin ${adminId}.`);
    return updated;
  }

  // ─── Subscriptions ────────────────────────────────────────────────────────────

  /**
   * Returns paginated subscriptions with user info, optionally filtered by plan_type.
   */
  async getSubscriptions(page = 1, limit = 20, plan_type?: string) {
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const where: Prisma.SubscriptionWhereInput = {};
    if (plan_type) {
      where.plan_type = plan_type;
    }

    const [subscriptions, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions,
      total,
      page,
      limit: safeLimit,
      total_pages: Math.ceil(total / safeLimit),
    };
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────────

  /**
   * Returns paginated audit logs with the acting user's info.
   */
  async getAuditLogs(page = 1, limit = 20) {
    const safeLimit = Math.min(limit, 100);
    const skip = (page - 1) * safeLimit;

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        skip,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      logs,
      total,
      page,
      limit: safeLimit,
      total_pages: Math.ceil(total / safeLimit),
    };
  }
}
