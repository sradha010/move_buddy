import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { DocumentsModule } from './documents/documents.module';
import { MapsModule } from './maps/maps.module';
import { RidesModule } from './rides/rides.module';
import { RideRequestsModule } from './ride-requests/ride-requests.module';
import { PricingModule } from './pricing/pricing.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], envFilePath: '.env' }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ([{
        ttl: 60000,
        limit: 100,
      }]),
    }),
    PrismaModule,
    FirebaseModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    DocumentsModule,
    MapsModule,
    RidesModule,
    RideRequestsModule,
    PricingModule,
    SubscriptionsModule,
    PaymentsModule,
    NotificationsModule,
    ReviewsModule,
    ReportsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
