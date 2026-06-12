import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdatePricingDto {
  @ApiPropertyOptional({
    example: 6.5,
    description: 'BuddyRide price per kilometre (INR). Min 0.1.',
    minimum: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  per_km_rate?: number;

  @ApiPropertyOptional({
    example: 7.0,
    description: 'Rapido competitor rate per kilometre (INR). Min 0.1.',
    minimum: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  rapido_rate?: number;

  @ApiPropertyOptional({
    example: 8.0,
    description: 'Auto competitor rate per kilometre (INR). Min 0.1.',
    minimum: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  auto_rate?: number;

  @ApiPropertyOptional({
    example: 10.0,
    description: 'Ola competitor rate per kilometre (INR). Min 0.1.',
    minimum: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  ola_rate?: number;

  @ApiPropertyOptional({
    example: 12.0,
    description: 'Uber competitor rate per kilometre (INR). Min 0.1.',
    minimum: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  uber_rate?: number;

  @ApiPropertyOptional({
    example: 'Adjusted rates to stay competitive for Q3.',
    description: 'Optional reason for the pricing update (recorded in history).',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
