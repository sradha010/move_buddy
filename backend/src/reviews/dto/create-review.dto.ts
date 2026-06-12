import {
  IsUUID,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateReviewDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'UUID of the completed ride being reviewed',
  })
  @IsUUID()
  ride_id: string;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID of the user being reviewed',
  })
  @IsUUID()
  reviewee_id: string;

  @ApiProperty({
    example: 4,
    description: 'Rating from 1 (worst) to 5 (best)',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({
    example: 'Great driver, very punctual and friendly!',
    description: 'Optional text comment (max 500 characters)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
