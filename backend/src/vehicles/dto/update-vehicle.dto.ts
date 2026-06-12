import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VehicleStatus } from '@prisma/client';
import { CreateVehicleDto } from './create-vehicle.dto';

export class UpdateVehicleDto extends PartialType(CreateVehicleDto) {
  @ApiPropertyOptional({
    enum: VehicleStatus,
    example: VehicleStatus.active,
    description: 'Vehicle status: active or inactive',
  })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}
