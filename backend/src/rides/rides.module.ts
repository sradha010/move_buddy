import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
