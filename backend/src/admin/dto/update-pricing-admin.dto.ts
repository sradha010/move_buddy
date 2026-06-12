import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdatePricingAdminDto {
  @ApiProperty({
    example: 6.5,
    description: 'BuddyRide price per kilometre (INR). Minimum 0.1.',
    minimum: 0.1,
  })
  @IsNumber({}, { message: 'per_km_rate must be a number.' })
  @Min(0.1, { message: 'per_km_rate must be at least 0.1.' })
  @Type(() => Number)
  per_km_rate: number;

  @ApiProperty({
    example: 7.0,
    description: 'Rapido competitor rate per kilometre (INR).',
  })
  @IsNumber({}, { message: 'rapido_rate must be a number.' })
  @Type(() => Number)
  rapido_rate: number;

  @ApiProperty({
    example: 8.0,
    description: 'Auto competitor rate per kilometre (INR).',
  })
  @IsNumber({}, { message: 'auto_rate must be a number.' })
  @Type(() => Number)
  auto_rate: number;

  @ApiProperty({
    example: 10.0,
    description: 'Ola competitor rate per kilometre (INR).',
  })
  @IsNumber({}, { message: 'ola_rate must be a number.' })
  @Type(() => Number)
  ola_rate: number;

  @ApiProperty({
    example: 12.0,
    description: 'Uber competitor rate per kilometre (INR).',
  })
  @IsNumber({}, { message: 'uber_rate must be a number.' })
  @Type(() => Number)
  uber_rate: number;

  @ApiProperty({
    example: 'Quarterly rate revision for competitive alignment.',
    description: 'Reason for the pricing update (recorded in history).',
  })
  @IsString({ message: 'reason must be a string.' })
  reason: string;
}
