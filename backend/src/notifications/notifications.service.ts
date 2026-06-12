import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Core CRUD ────────────────────────────────────────────────────────────────

  /**
   * Persist a new Notification record.
   * senderId may be null for system-generated notifications.
   */
  async create(
    senderId: string | null,
    receiverId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: object,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        sender_id: senderId ?? null,
        receiver_id: receiverId,
        type,
        title,
        message,
        data: data ?? undefined,
        is_read: false,
      },
    });

    this.logger.log(
      `Notification created: id=${notification.id}, type=${type}, receiver=${receiverId}`,
    );

    // Future: emit WebSocket event here
    // this.eventsGateway.sendToUser(receiverId, 'notification', notification);

    return notification;
  }

  // ─── Query ────────────────────────────────────────────────────────────────────

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unread_count] = await Promise.all([
      this.prisma.notification.findMany({
        where: { receiver_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { receiver_id: userId },
      }),
      this.prisma.notification.count({
        where: { receiver_id: userId, is_read: false },
      }),
    ]);

    return {
      notifications,
      total,
      unread_count,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<{ unread_count: number }> {
    const unread_count = await this.prisma.notification.count({
      where: { receiver_id: userId, is_read: false },
    });

    return { unread_count };
  }

  // ─── Mark as Read ─────────────────────────────────────────────────────────────

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with id '${notificationId}' not found.`,
      );
    }

    if (notification.receiver_id !== userId) {
      throw new ForbiddenException(
        'You do not have permission to mark this notification as read.',
      );
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true },
    });

    return updated;
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { receiver_id: userId, is_read: false },
      data: { is_read: true },
    });

    this.logger.log(
      `Marked ${result.count} notification(s) as read for user=${userId}`,
    );

    return { updated: result.count };
  }

  // ─── Domain Helper Methods ────────────────────────────────────────────────────

  /**
   * Notify a ride host that a new guest has requested to join their ride.
   *
   * @param hostId     - UUID of the host who listed the ride
   * @param guestName  - Display name of the requesting guest
   * @param rideRoute  - Human-readable route string, e.g. "Mumbai → Pune"
   */
  async notifyRideRequested(
    hostId: string,
    guestName: string,
    rideRoute: string,
  ) {
    return this.create(
      null,
      hostId,
      NotificationType.ride_requested,
      'New Ride Request',
      `${guestName} has requested to join your ride: ${rideRoute}.`,
      { guest_name: guestName, ride_route: rideRoute },
    );
  }

  /**
   * Notify a guest that the host has accepted their ride request.
   *
   * @param guestId   - UUID of the guest whose request was accepted
   * @param hostName  - Display name of the accepting host
   * @param rideRoute - Human-readable route string
   */
  async notifyRideAccepted(
    guestId: string,
    hostName: string,
    rideRoute: string,
  ) {
    return this.create(
      null,
      guestId,
      NotificationType.ride_accepted,
      'Ride Request Accepted',
      `${hostName} has accepted your request for the ride: ${rideRoute}.`,
      { host_name: hostName, ride_route: rideRoute },
    );
  }

  /**
   * Notify a guest that the host has rejected their ride request.
   *
   * @param guestId   - UUID of the guest whose request was rejected
   * @param rideRoute - Human-readable route string
   */
  async notifyRideRejected(guestId: string, rideRoute: string) {
    return this.create(
      null,
      guestId,
      NotificationType.ride_rejected,
      'Ride Request Rejected',
      `Your request for the ride (${rideRoute}) was not accepted. Please look for another ride.`,
      { ride_route: rideRoute },
    );
  }

  /**
   * Notify a user that their subscription purchase was successful.
   *
   * @param userId   - UUID of the subscribing user
   * @param planType - Plan identifier, e.g. "30d"
   */
  async notifySubscriptionPurchased(userId: string, planType: string) {
    return this.create(
      null,
      userId,
      NotificationType.subscription_purchased,
      'Subscription Activated',
      `Your ${planType} subscription plan has been activated successfully. Enjoy discounted rides!`,
      { plan_type: planType },
    );
  }

  /**
   * Notify a user that their payment was processed successfully.
   *
   * @param userId - UUID of the paying user
   * @param amount - Amount paid in INR
   */
  async notifyPaymentSuccess(userId: string, amount: number) {
    return this.create(
      null,
      userId,
      NotificationType.payment_success,
      'Payment Successful',
      `Your payment of ₹${amount.toFixed(2)} was processed successfully.`,
      { amount },
    );
  }
}
