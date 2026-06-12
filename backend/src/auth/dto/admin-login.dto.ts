import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Admin account password (min 6 characters)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
