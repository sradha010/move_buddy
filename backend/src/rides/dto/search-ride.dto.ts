import { IsOptional, IsNumber, IsDateString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchRideDto {
  @ApiPropertyOptional({
    example: 18.5362,
    description: "Latitude of the passenger's origin. Used for proximity filtering.",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  origin_lat?: number;

  @ApiPropertyOptional({
    example: 73.8942,
    description: "Longitude of the passenger's origin. Used for proximity filtering.",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  origin_lng?: number;

  @ApiPropertyOptional({
    example: 18.5913,
    description: "Latitude of the passenger's destination. Used for proximity filtering.",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destination_lat?: number;

  @ApiPropertyOptional({
    example: 73.7390,
    description: "Longitude of the passenger's destination. Used for proximity filtering.",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destination_lng?: number;

  @ApiPropertyOptional({
    example: '2026-06-15',
    description: 'Filter rides departing on a specific date (YYYY-MM-DD or ISO 8601).',
  })
  @IsOptional()
  @IsDateString()
  departure_date?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Minimum number of seats required by the passenger.',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  available_seats?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination. Defaults to 1.',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of results per page. Defaults to 20. Max 50.',
    default: 20,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;
}
