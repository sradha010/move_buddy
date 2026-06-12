import { IsArray, IsHexColor, IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandingDto {
  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logo.png',
    description: 'URL of the application logo.',
  })
  @IsOptional()
  @IsUrl({}, { message: 'logo_url must be a valid URL.' })
  logo_url?: string;

  @ApiPropertyOptional({
    example: '#FF7D00',
    description: 'Primary brand colour in hex format.',
  })
  @IsOptional()
  @IsHexColor({ message: 'primary_color must be a valid hex colour (e.g. #FF7D00).' })
  primary_color?: string;

  @ApiPropertyOptional({
    example: [{ label: 'Home', href: '/' }, { label: 'About', href: '/about' }],
    description: 'Array of navbar link objects.',
    type: 'array',
    items: { type: 'object' },
  })
  @IsOptional()
  @IsArray({ message: 'navbar_links must be an array.' })
  navbar_links?: object[];
}
