import {
  Controller,
  Get,
  Patch,
  Body,
  Query,
  UseGuards,
  ParseFloatPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PricingService } from './pricing.service';
import { UpdatePricingDto } from './dto/update-pricing.dto';

@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ─── GET /pricing ─────────────────────────────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get current pricing configuration',
    description:
      'Returns the active BuddyRide pricing config including per-km rate and ' +
      'all competitor reference rates. Publicly accessible.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current pricing configuration returned.',
  })
  async getCurrentPricing() {
    return this.pricingService.getCurrentPricing();
  }

  // ─── GET /pricing/calculate ───────────────────────────────────────────────────

  @Get('calculate')
  @Public()
  @ApiOperation({
    summary: 'Calculate fare for a trip',
    description:
      'Computes the BuddyRide fare for a given distance, optionally applying a ' +
      'subscription discount (7d=0%, 15d=2%, 30d=5%). Returns a full price ' +
      'breakdown with base price, discount amount and final price.',
  })
  @ApiQuery({
    name: 'distance',
    type: Number,
    required: true,
    description: 'Trip distance in kilometres (must be > 0)',
    example: 14.5,
  })
  @ApiQuery({
    name: 'subscription_days',
    type: Number,
    required: false,
    description: 'Subscription plan days: 7, 15, or 30',
    example: 30,
  })
  @ApiResponse({ status: 200, description: 'Fare breakdown returned.' })
  @ApiResponse({ status: 400, description: 'Invalid distance value.' })
  async calculateFare(
    @Query('distance', ParseFloatPipe) distance: number,
    @Query('subscription_days') subscriptionDaysRaw?: string,
  ) {
    let subscriptionDays: number | undefined;

    if (subscriptionDaysRaw !== undefined) {
      const parsed = parseInt(subscriptionDaysRaw, 10);
      if (isNaN(parsed) || ![7, 15, 30].includes(parsed)) {
        throw new BadRequestException(
          'subscription_days must be one of: 7, 15, 30.',
        );
      }
      subscriptionDays = parsed;
    }

    return this.pricingService.calculateFare(distance, subscriptionDays);
  }

  // ─── GET /pricing/compare ─────────────────────────────────────────────────────

  @Get('compare')
  @Public()
  @ApiOperation({
    summary: 'Compare BuddyRide fare against competitors',
    description:
      'Returns a side-by-side fare comparison between BuddyRide and Rapido, ' +
      'Auto, Ola and Uber for the given trip distance. Savings figures show ' +
      'how much cheaper BuddyRide is vs each platform.',
  })
  @ApiQuery({
    name: 'distance',
    type: Number,
    required: true,
    description: 'Trip distance in kilometres (must be > 0)',
    example: 14.5,
  })
  @ApiResponse({ status: 200, description: 'Competitor comparison returned.' })
  @ApiResponse({ status: 400, description: 'Invalid distance value.' })
  async getCompetitorRates(
    @Query('distance', ParseFloatPipe) distance: number,
  ) {
    return this.pricingService.getCompetitorRates(distance);
  }

  // ─── GET /pricing/history ─────────────────────────────────────────────────────

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pricing change history (admin only)',
    description:
      'Returns a paginated list of historical per-km rate changes, ' +
      'including who made the change and any recorded reason. ' +
      'Restricted to admin users.',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Records per page (default: 20, max: 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated pricing history returned.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getPricingHistory(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.pricingService.getPricingHistory(page, limit);
  }

  // ─── PATCH /pricing ───────────────────────────────────────────────────────────

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update pricing configuration (admin only)',
    description:
      'Updates one or more pricing rates. Automatically snapshots the previous ' +
      'per_km_rate into pricing history and writes a full audit log entry. ' +
      'All fields are optional — supply only those you wish to change.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pricing configuration updated successfully.',
  })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async updatePricing(
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdatePricingDto,
  ) {
    return this.pricingService.updatePricing(adminId, dto);
  }
}
