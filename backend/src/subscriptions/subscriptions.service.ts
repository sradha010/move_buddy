import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { SubscriptionStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeDto, PlanType } from './dto/subscribe.dto';
import { UpgradeDto } from './dto/upgrade.dto';

// ─── Plan Catalogue ───────────────────────────────────────────────────────────

export interface PlanConfig {
  plan_type: string;
  days: number;
  discount_pct: number;
  price: number;
}

const PLANS: Record<string, PlanConfig> = {
  '7d': { plan_type: '7d', days: 7, discount_pct: 0, price: 99 },
  '15d': { plan_type: '15d', days: 15, discount_pct: 2, price: 189 },
  '30d': { plan_type: '30d', days: 30, discount_pct: 5, price: 349 },
};

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Get Plans ──────────────────────────────────────────────────────────────

  getPlans(): PlanConfig[] {
    return Object.values(PLANS);
  }

  // ─── Active Subscription ────────────────────────────────────────────────────

  async getActiveSubscription(userId: string) {
    const now = new Date();
    return this.prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: SubscriptionStatus.active,
        ends_at: { gt: now },
      },
      orderBy: { started_at: 'desc' },
    });
  }

  // ─── Subscribe ───────────────────────────────────────────────────────────────

  async subscribe(userId: string, dto: SubscribeDto) {
    const existing = await this.getActiveSubscription(userId);
    if (existing) {
      throw new ConflictException(
        'Already subscribed. Use upgrade endpoint.',
      );
    }

    const plan = PLANS[dto.plan_type];
    if (!plan) {
      throw new BadRequestException(`Unknown plan type: ${dto.plan_type}`);
    }

    // Guard: ensure the payment was actually completed before activating
    if (dto.payment_id) {
      const payment = await this.prisma.payment.findUnique({
        where: { payment_id: dto.payment_id },
      });
      if (!payment) {
        throw new BadRequestException('Payment record not found.');
      }
      if (payment.status !== PaymentStatus.completed) {
        throw new BadRequestException(
          `Payment is not completed (current status: ${payment.status}). Cannot activate subscription.`,
        );
      }
      if (payment.user_id !== userId) {
        throw new UnauthorizedException('Payment does not belong to this account.');
      }
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);

    const subscription = await this.prisma.subscription.create({
      data: {
        user_id: userId,
        plan_type: plan.plan_type,
        plan_days: plan.days,
        discount_pct: plan.discount_pct,
        price_paid: plan.price,
        started_at: now,
        ends_at: endsAt,
        status: SubscriptionStatus.active,
        payment_id: dto.payment_id ?? null,
      },
    });

    this.logger.log(
      `Subscription created: user=${userId}, plan=${plan.plan_type}, ends=${endsAt.toISOString()}`,
    );

    return subscription;
  }

  // ─── Upgrade ─────────────────────────────────────────────────────────────────

  async upgrade(userId: string, dto: UpgradeDto) {
    const current = await this.getActiveSubscription(userId);
    if (!current) {
      throw new BadRequestException('No active subscription');
    }

    const newPlan = PLANS[dto.plan_type];
    if (!newPlan) {
      throw new BadRequestException(`Unknown plan type: ${dto.plan_type}`);
    }

    if (newPlan.days <= current.plan_days) {
      throw new BadRequestException('Cannot downgrade');
    }

    // Guard: verify the upgrade payment is completed
    if (dto.payment_id) {
      const payment = await this.prisma.payment.findUnique({
        where: { payment_id: dto.payment_id },
      });
      if (!payment) {
        throw new BadRequestException('Payment record not found.');
      }
      if (payment.status !== PaymentStatus.completed) {
        throw new BadRequestException(
          `Payment is not completed (status: ${payment.status}). Cannot upgrade subscription.`,
        );
      }
      if (payment.user_id !== userId) {
        throw new UnauthorizedException('Payment does not belong to this account.');
      }
    }

    const now = new Date();

    // Calculate remaining days on current subscription (floor to full days)
    const remainingMs = Math.max(0, current.ends_at.getTime() - now.getTime());
    const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));

    // Credit remaining days toward new plan so the user does not lose time
    const effectiveDays = newPlan.days + remainingDays;
    const newEndsAt = new Date(
      now.getTime() + effectiveDays * 24 * 60 * 60 * 1000,
    );

    // Expire the current subscription and create the new one atomically
    const [, newSubscription] = await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { id: current.id },
        data: { status: SubscriptionStatus.expired },
      }),
      this.prisma.subscription.create({
        data: {
          user_id: userId,
          plan_type: newPlan.plan_type,
          plan_days: newPlan.days,
          discount_pct: newPlan.discount_pct,
          price_paid: newPlan.price,
          started_at: now,
          ends_at: newEndsAt,
          status: SubscriptionStatus.active,
          payment_id: null,
        },
      }),
    ]);

    this.logger.log(
      `Subscription upgraded: user=${userId}, ` +
        `${current.plan_type} → ${newPlan.plan_type}, ` +
        `remaining days credited=${remainingDays}, ends=${newEndsAt.toISOString()}`,
    );

    return newSubscription;
  }

  // ─── Expire Subscriptions (cron-ready) ───────────────────────────────────────

  async expireSubscriptions(): Promise<{ count: number }> {
    const now = new Date();
    const result = await this.prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.active,
        ends_at: { lte: now },
      },
      data: { status: SubscriptionStatus.expired },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} subscription(s) at ${now.toISOString()}`);
    }

    return { count: result.count };
  }

  // ─── Subscription History ────────────────────────────────────────────────────

  async getUserSubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { user_id: userId },
      orderBy: { started_at: 'desc' },
    });
  }

  // ─── Discount for User ───────────────────────────────────────────────────────

  async getDiscountForUser(userId: string): Promise<number> {
    const active = await this.getActiveSubscription(userId);
    return active ? active.discount_pct : 0;
  }
}
