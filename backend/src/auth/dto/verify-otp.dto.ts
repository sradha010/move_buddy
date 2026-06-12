import { IsMobilePhone, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Indian mobile number with country code' })
  @IsMobilePhone('en-IN')
  phone: string;

  @ApiProperty({ example: '482930', description: '6-digit OTP sent to the phone number' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otp: string;
}
