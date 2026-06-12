import {
  Controller,
  Get,
  Query,
  ParseFloatPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { MapsService } from './maps.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Maps')
@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  // ─── GET /maps/autocomplete?q={query}&lang={lang} ─────────────────────────────

  @Public()
  @Get('autocomplete')
  @ApiOperation({
    summary: 'Autocomplete a place query',
    description:
      'Returns up to 10 place suggestions matching the given text within India ' +
      '(localities, streets, and venues). Powered by OpenRouteService.',
  })
  @ApiQuery({ name: 'q', description: 'Search text', example: 'Connaught' })
  @ApiQuery({
    name: 'lang',
    description: 'BCP-47 language code',
    example: 'en',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Array of autocomplete suggestions.',
    schema: {
      example: [
        {
          label: 'Connaught Place, New Delhi, India',
          lat: 28.6289,
          lng: 77.2065,
          placeId: 'whosonfirst:locality:abc123',
        },
      ],
    },
  })
  @ApiResponse({ status: 400, description: 'Missing or empty query parameter.' })
  async autocomplete(
    @Query('q') query: string,
    @Query('lang') lang?: string,
  ) {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Query parameter "q" must not be empty.');
    }
    return this.mapsService.autocomplete(query, lang ?? 'en');
  }

  // ─── GET /maps/geocode?address={address} ──────────────────────────────────────

  @Public()
  @Get('geocode')
  @ApiOperation({
    summary: 'Geocode a free-text address to coordinates',
    description:
      'Resolves a human-readable address string to a single lat/lng coordinate ' +
      'within India. Powered by OpenRouteService.',
  })
  @ApiQuery({
    name: 'address',
    description: 'Free-text address to geocode',
    example: 'India Gate, New Delhi',
  })
  @ApiResponse({
    status: 200,
    description: 'Geocoded coordinate and canonical label.',
    schema: {
      example: {
        lat: 28.6129,
        lng: 77.2295,
        label: 'India Gate, New Delhi, Delhi, India',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Missing address or no result found.' })
  async geocode(@Query('address') address: string) {
    if (!address || address.trim().length === 0) {
      throw new BadRequestException(
        'Query parameter "address" must not be empty.',
      );
    }
    return this.mapsService.geocode(address);
  }

  // ─── GET /maps/route?originLat=&originLng=&destLat=&destLng= ─────────────────

  @Public()
  @Get('route')
  @ApiOperation({
    summary: 'Get driving route between two coordinates',
    description:
      'Returns the estimated driving distance (km), duration (minutes), ' +
      'and an encoded polyline for the fastest driving route between origin and ' +
      'destination. Powered by OpenRouteService.',
  })
  @ApiQuery({ name: 'originLat',  description: 'Origin latitude',       example: '28.6139' })
  @ApiQuery({ name: 'originLng',  description: 'Origin longitude',      example: '77.2090' })
  @ApiQuery({ name: 'destLat',    description: 'Destination latitude',  example: '19.0760' })
  @ApiQuery({ name: 'destLng',    description: 'Destination longitude', example: '72.8777' })
  @ApiResponse({
    status: 200,
    description: 'Route summary and encoded polyline.',
    schema: {
      example: {
        distance_km: 1412.3,
        duration_minutes: 1048,
        polyline: 'mfmcBkkqlM...',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid coordinates or no route found.' })
  async getRoute(
    @Query('originLat', ParseFloatPipe) originLat: number,
    @Query('originLng', ParseFloatPipe) originLng: number,
    @Query('destLat',   ParseFloatPipe) destLat:   number,
    @Query('destLng',   ParseFloatPipe) destLng:   number,
  ) {
    return this.mapsService.getRoute(originLat, originLng, destLat, destLng);
  }
}
