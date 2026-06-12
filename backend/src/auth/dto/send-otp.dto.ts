import { IsMobilePhone } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210', description: 'Indian mobile number with country code' })
  @IsMobilePhone('en-IN')
  phone: string;
}
