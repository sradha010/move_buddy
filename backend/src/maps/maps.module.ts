import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

/**
 * MapsModule
 *
 * Provides geocoding, autocomplete, and routing capabilities via the
 * OpenRouteService (ORS) API. Uses the native axios package already present
 * in package.json — no @nestjs/axios dependency required.
 *
 * ConfigModule is imported to ensure ConfigService is available in MapsService
 * even when this module is bootstrapped in isolation (e.g., for integration
 * tests). In the main AppModule it is already registered as global, so the
 * import here is a safe no-op in that context.
 */
@Module({
  imports: [
    ConfigModule,
  ],
  controllers: [MapsController],
  providers:   [MapsService],
  exports:     [MapsService],
})
export class MapsModule {}
