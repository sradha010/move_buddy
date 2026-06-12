import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@ApiTags('Vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // ─── GET /vehicles ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'List own vehicles',
    description: 'Returns all active vehicles belonging to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of vehicles returned successfully.',
  })
  async getMyVehicles(@CurrentUser('id') userId: string) {
    return this.vehiclesService.findAllByOwner(userId);
  }

  // ─── POST /vehicles ───────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new vehicle',
    description:
      'Creates a new vehicle for the authenticated user. Vehicle registration number must be unique and uppercase.',
  })
  @ApiResponse({
    status: 201,
    description: 'Vehicle registered successfully.',
  })
  @ApiResponse({
    status: 409,
    description: 'Vehicle with the given registration number already exists.',
  })
  async createVehicle(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(userId, dto);
  }

  // ─── GET /vehicles/:id ────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({
    summary: 'Get vehicle by ID',
    description:
      'Returns a single vehicle by its UUID. The vehicle must belong to the authenticated user.',
  })
  @ApiParam({ name: 'id', description: 'Vehicle UUID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle returned successfully.',
  })
  @ApiResponse({ status: 403, description: 'Access denied — vehicle belongs to another user.' })
  @ApiResponse({ status: 404, description: 'Vehicle not found.' })
  async getVehicleById(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehiclesService.findById(id, userId);
  }

  // ─── PATCH /vehicles/:id ──────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a vehicle',
    description:
      'Partially updates a vehicle owned by the authenticated user. All fields are optional.',
  })
  @ApiParam({ name: 'id', description: 'Vehicle UUID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle updated successfully.',
  })
  @ApiResponse({ status: 403, description: 'Access denied — vehicle belongs to another user.' })
  @ApiResponse({ status: 404, description: 'Vehicle not found.' })
  @ApiResponse({ status: 409, description: 'New vehicle number conflicts with an existing record.' })
  async updateVehicle(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, userId, dto);
  }

  // ─── DELETE /vehicles/:id ─────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove a vehicle (soft delete)',
    description:
      'Deactivates a vehicle owned by the authenticated user by setting its status to inactive. The record is retained for referential integrity.',
  })
  @ApiParam({ name: 'id', description: 'Vehicle UUID' })
  @ApiResponse({
    status: 200,
    description: 'Vehicle deactivated successfully.',
  })
  @ApiResponse({ status: 403, description: 'Access denied — vehicle belongs to another user.' })
  @ApiResponse({ status: 404, description: 'Vehicle not found.' })
  async removeVehicle(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.vehiclesService.remove(id, userId);
  }
}
