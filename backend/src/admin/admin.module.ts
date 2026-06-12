import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PricingModule } from '../pricing/pricing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, PricingModule, NotificationsModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
