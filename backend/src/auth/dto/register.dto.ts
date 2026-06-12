import {
  IsString,
  IsOptional,
  IsEmail,
  IsMobilePhone,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Rahul Sharma', description: 'Full name of the user' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ required: false, example: 'rahul@example.com', description: 'Optional email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+919876543210', description: 'Indian mobile number with country code' })
  @IsMobilePhone('en-IN')
  phone: string;
}
