import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEmail, MinLength } from 'class-validator';

export class VerifyFirebaseDto {
  @ApiProperty({ description: 'Firebase ID token returned after phone OTP verification' })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiProperty({ required: false, description: 'Full name (required for first-time sign-up)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;
}
