import {
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRequestDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID of the ride the guest wants to join',
  })
  @IsUUID()
  ride_id: string;

  @ApiPropertyOptional({
    example: '12, MG Road, Bengaluru',
    description: 'Custom pickup address for the guest (optional — defaults to ride origin)',
  })
  @IsOptional()
  @IsString()
  pickup_address?: string;

  @ApiPropertyOptional({
    example: 12.9716,
    description: 'Pickup latitude (WGS-84)',
  })
  @IsOptional()
  @IsNumber()
  pickup_lat?: number;

  @ApiPropertyOptional({
    example: 77.5946,
    description: 'Pickup longitude (WGS-84)',
  })
  @IsOptional()
  @IsNumber()
  pickup_lng?: number;

  @ApiPropertyOptional({
    example: '45, Indiranagar, Bengaluru',
    description: 'Custom dropoff address for the guest (optional — defaults to ride destination)',
  })
  @IsOptional()
  @IsString()
  dropoff_address?: string;

  @ApiPropertyOptional({
    example: 12.9784,
    description: 'Dropoff latitude (WGS-84)',
  })
  @IsOptional()
  @IsNumber()
  dropoff_lat?: number;

  @ApiPropertyOptional({
    example: 77.6408,
    description: 'Dropoff longitude (WGS-84)',
  })
  @IsOptional()
  @IsNumber()
  dropoff_lng?: number;
}
