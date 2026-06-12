import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UpgradeDto } from './dto/upgrade.dto';

@ApiTags('Subscriptions')
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // ─── GET /subscriptions/plans ─────────────────────────────────────────────

  @Get('plans')
  @Public()
  @ApiOperation({
    summary: 'List all available subscription plans',
    description:
      'Returns all plan options with pricing, duration and discount information. Publicly accessible.',
  })
  @ApiResponse({ status: 200, description: 'Plan catalogue returned.' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  // ─── GET /subscriptions/my ────────────────────────────────────────────────

  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current active subscription',
    description:
      'Returns the authenticated user\'s currently active subscription, or null if none.',
  })
  @ApiResponse({ status: 200, description: 'Active subscription returned (null if none).' })
  @ApiResponse({ status: 401, description: 'Unauthorised.' })
  async getActiveSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getActiveSubscription(userId);
  }

  // ─── GET /subscriptions/history ──────────────────────────────────────────

  @Get('history')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription history',
    description:
      'Returns all subscriptions (active, expired, cancelled) for the authenticated user, ordered by start date descending.',
  })
  @ApiResponse({ status: 200, description: 'Subscription history returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorised.' })
  async getUserSubscriptions(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getUserSubscriptions(userId);
  }

  // ─── POST /subscriptions ─────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Purchase a subscription',
    description:
      'Creates a new subscription for the authenticated user. ' +
      'Throws 409 if the user already has an active subscription — use the upgrade endpoint instead.',
  })
  @ApiResponse({ status: 201, description: 'Subscription created.' })
  @ApiResponse({
    status: 409,
    description: 'User already has an active subscription.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorised.' })
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptionsService.subscribe(userId, dto);
  }

  // ─── POST /subscriptions/upgrade ─────────────────────────────────────────

  @Post('upgrade')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Upgrade active subscription',
    description:
      'Upgrades the current active subscription to a higher-tier plan. ' +
      'Remaining days from the current plan are credited toward the new plan. ' +
      'Downgrades are not permitted.',
  })
  @ApiResponse({ status: 201, description: 'Subscription upgraded.' })
  @ApiResponse({
    status: 400,
    description: 'No active subscription or downgrade attempted.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorised.' })
  async upgrade(
    @CurrentUser('id') userId: string,
    @Body() dto: UpgradeDto,
  ) {
    return this.subscriptionsService.upgrade(userId, dto);
  }
}
