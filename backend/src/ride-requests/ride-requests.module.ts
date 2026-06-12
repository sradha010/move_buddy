import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MapsModule } from '../maps/maps.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RideRequestsController } from './ride-requests.controller';
import { RideRequestsService } from './ride-requests.service';

@Module({
  imports: [
    PrismaModule,
    MapsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [RideRequestsController],
  providers: [RideRequestsService],
  exports: [RideRequestsService],
})
export class RideRequestsModule {}
