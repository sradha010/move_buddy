import { IsString, Matches, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({
    example: 'car',
    description: 'Type of vehicle (e.g. car, bike, auto)',
  })
  @IsString()
  @MinLength(2)
  vehicle_type: string;

  @ApiProperty({
    example: 'MH12AB1234',
    description:
      'Vehicle registration number in uppercase (e.g. MH12AB1234). Only letters and digits allowed.',
  })
  @IsString()
  @Matches(/^[A-Z0-9]+$/, {
    message:
      'vehicle_number must contain only uppercase letters and digits (e.g. MH12AB1234)',
  })
  vehicle_number: string;

  @ApiProperty({
    example: 'Maruti Swift',
    description: 'Make and model of the vehicle',
  })
  @IsString()
  @MinLength(2)
  vehicle_model: string;

  @ApiProperty({
    example: 'White',
    description: 'Color of the vehicle',
  })
  @IsString()
  @MinLength(2)
  vehicle_color: string;
}
