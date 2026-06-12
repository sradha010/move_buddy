import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-require-imports
import Razorpay = require('razorpay');
import { Orders } from 'razorpay/dist/types/orders';
import { Refunds } from 'razorpay/dist/types/refunds';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    this.webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');

    if (!this.keyId || !this.keySecret) {
      throw new InternalServerErrorException(
        'Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      );
    }

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  // ─── Create Order ─────────────────────────────────────────────────────────────

  async createOrder(userId: string, dto: CreateOrderDto) {
    const receipt = `order_${uuid()}`;

    let razorpayOrder: Orders.RazorpayOrder;
    try {
      razorpayOrder = await this.razorpay.orders.create({
        amount: Math.round(dto.amount * 100), // convert INR → paise
        currency: 'INR',
        receipt,
      });
    } catch (err) {
      this.logger.error('Razorpay order creation failed', err);
      throw new InternalServerErrorException(
        'Failed to create payment order. Please try again.',
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        user_id: userId,
        order_id: razorpayOrder.id,
        amount: dto.amount,
        currency: 'INR',
        status: PaymentStatus.pending,
        payment_type: dto.payment_type,
        reference_id: dto.reference_id,
      },
    });

    this.logger.log(
      `Order created: payment_db_id=${payment.id}, razorpay_order=${razorpayOrder.id}, user=${userId}`,
    );

    return {
      order_id: razorpayOrder.id,
      amount: dto.amount,
      currency: 'INR',
      key_id: this.keyId,
    };
  }

  // ─── Verify Payment ───────────────────────────────────────────────────────────

  async verifyPayment(orderId: string, paymentId: string, signature: string) {
    // Compute the expected HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      this.logger.warn(
        `Invalid payment signature for order=${orderId}, payment=${paymentId}`,
      );
      throw new UnauthorizedException('Invalid payment signature');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { order_id: orderId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment record not found for order_id=${orderId}`,
      );
    }

    const updated = await this.prisma.payment.update({
      where: { order_id: orderId },
      data: {
        payment_id: paymentId,
        status: PaymentStatus.completed,
        signature,
      },
    });

    await this.prisma.paymentLog.create({
      data: {
        payment_id: updated.id,
        event: 'payment.verified',
        data: {
          order_id: orderId,
          payment_id: paymentId,
          verified_at: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Payment verified: order=${orderId}, payment=${paymentId}`,
    );

    return { success: true };
  }

  // ─── Handle Webhook ───────────────────────────────────────────────────────────

  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!this.webhookSecret) {
      throw new InternalServerErrorException(
        'RAZORPAY_WEBHOOK_SECRET is not configured.',
      );
    }

    const isValid = validateWebhookSignature(
      rawBody.toString(),
      signature,
      this.webhookSecret,
    );

    if (!isValid) {
      this.logger.warn('Razorpay webhook signature validation failed');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString()) as {
      event: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            amount?: number;
            status?: string;
            error_description?: string;
          };
        };
      };
    };

    const eventName = event.event;
    const paymentEntity = event.payload?.payment?.entity;

    this.logger.log(`Webhook received: event=${eventName}`);

    if (paymentEntity?.order_id) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { order_id: paymentEntity.order_id },
      });

      if (existingPayment) {
        if (eventName === 'payment.captured') {
          await this.prisma.payment.update({
            where: { order_id: paymentEntity.order_id },
            data: {
              payment_id: paymentEntity.id ?? existingPayment.payment_id,
              status: PaymentStatus.completed,
            },
          });
          this.logger.log(
            `Webhook: payment captured for order=${paymentEntity.order_id}`,
          );
        } else if (eventName === 'payment.failed') {
          await this.prisma.payment.update({
            where: { order_id: paymentEntity.order_id },
            data: {
              payment_id: paymentEntity.id ?? existingPayment.payment_id,
              status: PaymentStatus.failed,
            },
          });
          this.logger.warn(
            `Webhook: payment failed for order=${paymentEntity.order_id}, reason=${paymentEntity.error_description ?? 'unknown'}`,
          );
        }

        await this.prisma.paymentLog.create({
          data: {
            payment_id: existingPayment.id,
            event: eventName,
            data: (paymentEntity as object) ?? {},
          },
        });
      } else {
        this.logger.warn(
          `Webhook: no payment record found for order_id=${paymentEntity.order_id}`,
        );
      }
    }

    return { received: true };
  }

  // ─── Payment History ──────────────────────────────────────────────────────────

  async getPaymentHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          order_id: true,
          payment_id: true,
          amount: true,
          currency: true,
          status: true,
          payment_type: true,
          reference_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
      this.prisma.payment.count({ where: { user_id: userId } }),
    ]);

    return {
      payments,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  // ─── Refund ───────────────────────────────────────────────────────────────────

  async refund(paymentId: string, amount?: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { payment_id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment with payment_id=${paymentId} not found`,
      );
    }

    const refundParams: Refunds.RazorpayRefundCreateRequestBody = {};
    if (amount !== undefined) {
      refundParams.amount = Math.round(amount * 100); // INR → paise
    }

    let refundResponse: Refunds.RazorpayRefund;
    try {
      refundResponse = await this.razorpay.payments.refund(
        paymentId,
        refundParams,
      );
    } catch (err) {
      this.logger.error(
        `Razorpay refund failed for payment_id=${paymentId}`,
        err,
      );
      throw new InternalServerErrorException(
        'Failed to process refund. Please try again.',
      );
    }

    const updated = await this.prisma.payment.update({
      where: { payment_id: paymentId },
      data: { status: PaymentStatus.refunded },
    });

    await this.prisma.paymentLog.create({
      data: {
        payment_id: updated.id,
        event: 'payment.refunded',
        data: {
          refund_id: refundResponse.id,
          amount_refunded: refundResponse.amount,
          refunded_at: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Refund processed: payment_id=${paymentId}, refund_id=${refundResponse.id}`,
    );

    return {
      success: true,
      refund_id: refundResponse.id,
      amount_refunded: (refundResponse.amount as number) / 100, // paise → INR
    };
  }
}
