import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ActiveMode } from '@prisma/client';

export class SwitchModeDto {
  @ApiProperty({
    enum: ActiveMode,
    example: ActiveMode.host,
    description: 'The mode to switch to: guest or host',
  })
  @IsEnum(ActiveMode)
  mode: ActiveMode;
}
