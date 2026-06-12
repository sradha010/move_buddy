import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SuspendUserDto {
  @ApiProperty({
    example: 'Violated community guidelines by sharing personal data.',
    description: 'Reason for suspending the user (minimum 5 characters).',
    minLength: 5,
  })
  @IsString({ message: 'reason must be a string.' })
  @MinLength(5, { message: 'reason must be at least 5 characters long.' })
  reason: string;
}
