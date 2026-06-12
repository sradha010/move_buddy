import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { RideStatus } from '@prisma/client';
import { CreateRideDto } from './create-ride.dto';

/**
 * All fields from CreateRideDto are optional. Coordinate fields are omitted
 * because changing a ride's route after creation requires re-calculating
 * distance, duration and price — that flow should go through a dedicated
 * re-plan endpoint rather than a generic patch.
 */
export class UpdateRideDto extends PartialType(
  OmitType(CreateRideDto, [
    'origin_lat',
    'origin_lng',
    'destination_lat',
    'destination_lng',
  ] as const),
) {
  @ApiPropertyOptional({
    enum: RideStatus,
    example: RideStatus.cancelled,
    description:
      'Allowed host-initiated transitions: open → cancelled, active → completed.',
  })
  @IsOptional()
  @IsEnum(RideStatus)
  status?: RideStatus;
}
