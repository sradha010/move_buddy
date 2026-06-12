import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

export const CLOUDINARY = 'CLOUDINARY';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DocumentsController],
  providers: [
    {
      provide: CLOUDINARY,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        cloudinary.config({
          cloud_name: configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
          api_key: configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
          api_secret: configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
        });
        return cloudinary;
      },
    },
    DocumentsService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
