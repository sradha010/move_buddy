import {
  IsString,
  IsNumber,
  IsInt,
  IsDateString,
  IsOptional,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRideDto {
  @ApiProperty({
    example: 'Koregaon Park, Pune, Maharashtra',
    description: 'Human-readable origin address',
  })
  @IsString()
  origin_address: string;

  @ApiProperty({
    example: 18.5362,
    description: 'Latitude of the origin point',
  })
  @IsNumber()
  @Type(() => Number)
  origin_lat: number;

  @ApiProperty({
    example: 73.8942,
    description: 'Longitude of the origin point',
  })
  @IsNumber()
  @Type(() => Number)
  origin_lng: number;

  @ApiProperty({
    example: 'Hinjewadi Phase 1, Pune, Maharashtra',
    description: 'Human-readable destination address',
  })
  @IsString()
  destination_address: string;

  @ApiProperty({
    example: 18.5913,
    description: 'Latitude of the destination point',
  })
  @IsNumber()
  @Type(() => Number)
  destination_lat: number;

  @ApiProperty({
    example: 73.7390,
    description: 'Longitude of the destination point',
  })
  @IsNumber()
  @Type(() => Number)
  destination_lng: number;

  @ApiProperty({
    example: 14.5,
    description: 'Total route distance in kilometres',
  })
  @IsNumber()
  @Type(() => Number)
  distance_km: number;

  @ApiProperty({
    example: 35,
    description: 'Estimated travel duration in minutes',
  })
  @IsInt()
  @Type(() => Number)
  duration_minutes: number;

  @ApiProperty({
    example: '2026-06-15T08:00:00.000Z',
    description: 'Scheduled departure time (ISO 8601)',
  })
  @IsDateString()
  departure_time: string;

  @ApiProperty({
    example: 8,
    description: 'Price per kilometre charged to each passenger (INR). Min 1, Max 100.',
    minimum: 1,
    maximum: 100,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  price_per_km: number;

  @ApiProperty({
    example: 3,
    description: 'Total passenger seats available for this ride. Min 1, Max 6.',
    minimum: 1,
    maximum: 6,
  })
  @IsInt()
  @Min(1)
  @Max(6)
  @Type(() => Number)
  total_seats: number;

  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID of the vehicle the host will use for this ride',
  })
  @IsOptional()
  @IsUUID()
  vehicle_id?: string;
}
