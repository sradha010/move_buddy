import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RideStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { RidesService } from './rides.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { SearchRideDto } from './dto/search-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';

@ApiTags('Rides')
@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  // ─── POST /rides/offer ────────────────────────────────────────────────────────

  @Post('offer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Offer a new ride',
    description:
      'Creates a new ride listing. The authenticated user becomes the host. ' +
      'Requires approved identity documents.',
  })
  @ApiResponse({ status: 201, description: 'Ride created successfully.' })
  @ApiResponse({
    status: 403,
    description: 'Host documents not approved.',
  })
  async offerRide(
    @CurrentUser('id') hostId: string,
    @Body() dto: CreateRideDto,
  ) {
    return this.ridesService.create(hostId, dto);
  }

  // ─── GET /rides/search ────────────────────────────────────────────────────────

  @Get('search')
  @Public()
  @ApiOperation({
    summary: 'Search available rides',
    description:
      'Returns paginated open rides. Optionally filter by proximity to origin/destination ' +
      'coordinates (within 20 km), departure date, and minimum seat count.',
  })
  @ApiResponse({ status: 200, description: 'List of matching rides.' })
  async searchRides(@Query() dto: SearchRideDto) {
    return this.ridesService.search(dto);
  }

  // ─── GET /rides/my ────────────────────────────────────────────────────────────

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current user's offered rides",
    description:
      'Returns all rides offered by the authenticated host, ordered by departure time descending. ' +
      'Optionally filter by ride status.',
  })
  @ApiQuery({
    name: 'status',
    enum: RideStatus,
    required: false,
    description: 'Filter by ride status',
  })
  @ApiResponse({ status: 200, description: "Host's rides returned." })
  async getMyRides(
    @CurrentUser('id') hostId: string,
    @Query('status') status?: RideStatus,
  ) {
    return this.ridesService.getHostRides(hostId, status);
  }

  // ─── GET /rides/:id ───────────────────────────────────────────────────────────

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get ride by ID',
    description:
      'Returns a single ride with host, vehicle and request count. Publicly accessible.',
  })
  @ApiParam({ name: 'id', description: 'Ride UUID' })
  @ApiResponse({ status: 200, description: 'Ride returned successfully.' })
  @ApiResponse({ status: 404, description: 'Ride not found.' })
  async getRideById(@Param('id', ParseUuidPipe) id: string) {
    return this.ridesService.findById(id);
  }

  // ─── PATCH /rides/:id ─────────────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a ride',
    description:
      'Partially updates a ride owned by the authenticated host. ' +
      'Allowed status transitions: open → cancelled, active → completed.',
  })
  @ApiParam({ name: 'id', description: 'Ride UUID' })
  @ApiResponse({ status: 200, description: 'Ride updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Ride not found.' })
  async updateRide(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') hostId: string,
    @Body() dto: UpdateRideDto,
  ) {
    return this.ridesService.update(id, hostId, dto);
  }

  // ─── DELETE /rides/:id ────────────────────────────────────────────────────────

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel a ride',
    description:
      'Soft-deletes (cancels) a ride owned by the authenticated host. ' +
      'Fails if any accepted ride requests are still attached to the ride.',
  })
  @ApiParam({ name: 'id', description: 'Ride UUID' })
  @ApiResponse({ status: 200, description: 'Ride cancelled successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel — accepted requests exist.',
  })
  @ApiResponse({ status: 403, description: 'Access denied.' })
  @ApiResponse({ status: 404, description: 'Ride not found.' })
  async removeRide(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') hostId: string,
  ) {
    return this.ridesService.remove(id, hostId);
  }
}
