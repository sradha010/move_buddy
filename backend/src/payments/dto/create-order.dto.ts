import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export type PaymentType = 'subscription' | 'ride';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Type of payment',
    enum: ['subscription', 'ride'],
    example: 'subscription',
  })
  @IsEnum(['subscription', 'ride'], {
    message: 'payment_type must be either subscription or ride',
  })
  payment_type: PaymentType;

  @ApiProperty({
    description: 'Plan type (e.g. "7d", "15d", "30d") or ride UUID',
    example: '15d',
  })
  @IsString()
  @IsNotEmpty()
  reference_id: string;

  @ApiProperty({
    description: 'Payment amount in INR (converted to paise internally)',
    example: 189,
    minimum: 1,
  })
  @IsNumber({}, { message: 'amount must be a number' })
  @Min(1, { message: 'amount must be at least ₹1' })
  amount: number;
}
