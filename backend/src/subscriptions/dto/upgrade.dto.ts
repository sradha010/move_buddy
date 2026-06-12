import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type UpgradablePlanType = '15d' | '30d';

export class UpgradeDto {
  @ApiProperty({
    enum: ['15d', '30d'],
    description: 'Target plan. Only upgrades allowed — cannot downgrade to 7d.',
    example: '30d',
  })
  @IsEnum(['15d', '30d'])
  plan_type: UpgradablePlanType;

  @ApiPropertyOptional({
    description: 'Payment ID from Razorpay after successful payment',
    example: 'pay_QxYzAbCd123',
  })
  @IsOptional()
  @IsString()
  payment_id?: string;
}
