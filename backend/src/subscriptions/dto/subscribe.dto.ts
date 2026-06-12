import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type PlanType = '7d' | '15d' | '30d';

export class SubscribeDto {
  @ApiProperty({
    enum: ['7d', '15d', '30d'],
    description: 'Subscription plan type',
    example: '30d',
  })
  @IsEnum(['7d', '15d', '30d'])
  plan_type: PlanType;

  @ApiPropertyOptional({
    description: 'Payment reference ID from payment gateway',
    example: 'pay_QxYzAbCd123',
  })
  @IsOptional()
  @IsString()
  payment_id?: string;
}
