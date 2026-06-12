import { IsEmail, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Rahul Sharma', description: 'Full name (min 2 characters)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'rahul@example.com', description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    description: 'Profile photo — either a public URL or a base64-encoded image string',
  })
  @IsOptional()
  @IsUrl({}, { message: 'profile_photo must be a valid URL' })
  profile_photo?: string;
}
