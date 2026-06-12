/**
 * IMPORTANT — Webhook raw body requirement
 * ─────────────────────────────────────────
 * Razorpay webhook signature verification requires the raw (un-parsed) request
 * body as a Buffer.  NestJS's default JSON body-parser will have already
 * consumed the stream before this handler runs unless you register a raw
 * parser for exactly this route BEFORE the global JSON parser.
 *
 * Add the following lines in main.ts, BEFORE `NestFactory.create(...)`:
 *
 *   import * as express from 'express';
 *   // ...inside bootstrap(), before app.setGlobalPrefix(...)
 *   app.use(
 *     '/api/v1/payments/webhook',
 *     express.raw({ type: 'application/json' }),
 *   );
 *
 * The raw body will then be available on `req.rawBody` (populated by the
 * raw middleware) or directly as `req.body` (a Buffer) when the raw parser
 * is registered for this path.
 */

import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';

class VerifyPaymentDto {
  order_id: string;
  payment_id: string;
  signature: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Create Order ──────────────────────────────────────────────────────────

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Razorpay order for a ride or subscription payment' })
  @ApiResponse({
    status: 201,
    description: 'Razorpay order created. Use the returned order_id and key_id in the Razorpay checkout SDK.',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.paymentsService.createOrder(userId, dto);
  }

  // ─── Verify Payment ────────────────────────────────────────────────────────

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Razorpay payment signature after checkout completion' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['order_id', 'payment_id', 'signature'],
      properties: {
        order_id: { type: 'string', description: 'Razorpay order ID returned by create-order' },
        payment_id: { type: 'string', description: 'Razorpay payment ID from checkout callback' },
        signature: { type: 'string', description: 'HMAC-SHA256 signature from checkout callback' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Payment verified successfully' })
  @ApiResponse({ status: 401, description: 'Invalid payment signature' })
  @ApiResponse({ status: 404, description: 'Payment record not found' })
  verifyPayment(
    @Body() body: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(
      body.order_id,
      body.payment_id,
      body.signature,
    );
  }

  // ─── Webhook ───────────────────────────────────────────────────────────────

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Razorpay webhook endpoint (public)',
    description:
      'Receives Razorpay events (payment.captured, payment.failed). ' +
      'Requires raw body middleware — see the file-level comment for setup instructions.',
  })
  @ApiResponse({ status: 200, description: 'Webhook received' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  handleWebhook(@Req() req: Request & { rawBody?: Buffer }) {
    // When express.raw() middleware is registered for this route, req.body is
    // a Buffer.  We also support the rawBody pattern used by some middleware.
    const rawBody: Buffer =
      req.rawBody instanceof Buffer
        ? req.rawBody
        : Buffer.isBuffer(req.body)
        ? (req.body as Buffer)
        : Buffer.from(JSON.stringify(req.body));

    const signature = req.headers['x-razorpay-signature'] as string;

    return this.paymentsService.handleWebhook(rawBody, signature);
  }

  // ─── Payment History ───────────────────────────────────────────────────────

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get paginated payment history for the authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Paginated list of payments' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getPaymentHistory(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.paymentsService.getPaymentHistory(userId, page, limit);
  }
}
