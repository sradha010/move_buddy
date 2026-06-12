import {
  IsUUID,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

/**
 * At least one of `reported_user_id` or `reported_ride_id` must be present.
 * We enforce this at service level as well, but the ValidateIf decorators
 * below make both fields required-when-the-other-is-absent so class-validator
 * surfaces a meaningful message.
 */
export class CreateReportDto {
  @ApiPropertyOptional({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description:
      'UUID of the user being reported. Either this or reported_ride_id (or both) must be provided.',
  })
  @IsOptional()
  @IsUUID()
  reported_user_id?: string;

  @ApiPropertyOptional({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description:
      'UUID of the ride being reported. Either this or reported_user_id (or both) must be provided.',
  })
  @IsOptional()
  @IsUUID()
  reported_ride_id?: string;

  @ApiProperty({
    example: 'Inappropriate behaviour during the ride',
    description:
      'Short reason for the report (minimum 5 characters). This will be visible to admins.',
    minLength: 5,
  })
  @ValidateIf(() => true)
  @IsString()
  @MinLength(5)
  reason: string;

  @ApiPropertyOptional({
    example:
      'The driver made several offensive remarks and drove recklessly at high speed.',
    description: 'Optional detailed description of the incident.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
