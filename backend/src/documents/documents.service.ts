import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';

export type DocumentType = 'aadhaar' | 'driving_license' | 'vehicle_rc' | 'insurance';

const DOCUMENT_URL_FIELD: Record<DocumentType, string> = {
  aadhaar: 'aadhaar_url',
  driving_license: 'driving_license_url',
  vehicle_rc: 'vehicle_rc_url',
  insurance: 'insurance_url',
};

export interface UpdateDocumentNumbersDto {
  aadhaar_number?: string;
  driving_license_number?: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  // ─── Upload Document ──────────────────────────────────────────────────────────

  async uploadDocument(
    userId: string,
    type: DocumentType,
    file: Express.Multer.File,
    metadata?: Record<string, unknown>,
  ) {
    const secureUrl = await this.uploadBufferToCloudinary(
      file.buffer,
      userId,
      type,
      file.mimetype,
    );

    const urlField = DOCUMENT_URL_FIELD[type];

    // Fetch the current record (if any) to check whether we need to reset status
    const existing = await this.prisma.userDocument.findUnique({
      where: { user_id: userId },
    });

    // If the document was previously rejected, reset to pending so admins re-review
    const statusReset =
      existing?.status === DocumentStatus.rejected
        ? { status: DocumentStatus.pending, rejection_reason: null, reviewed_by: null, reviewed_at: null }
        : {};

    const record = await this.prisma.userDocument.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        [urlField]: secureUrl,
        status: DocumentStatus.pending,
      },
      update: {
        [urlField]: secureUrl,
        ...statusReset,
      },
    });

    this.logger.log(
      `Document uploaded: userId=${userId}, type=${type}, url=${secureUrl}`,
    );

    return record;
  }

  // ─── Get Document Status ──────────────────────────────────────────────────────

  async getDocumentStatus(userId: string) {
    return this.prisma.userDocument.findUnique({
      where: { user_id: userId },
    });
  }

  // ─── Update Document Numbers ──────────────────────────────────────────────────

  async updateDocumentNumbers(userId: string, dto: UpdateDocumentNumbersDto) {
    if (!dto.aadhaar_number && !dto.driving_license_number) {
      throw new BadRequestException(
        'Provide at least one of aadhaar_number or driving_license_number.',
      );
    }

    const record = await this.prisma.userDocument.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        ...(dto.aadhaar_number && { aadhaar_number: dto.aadhaar_number }),
        ...(dto.driving_license_number && { driving_license_number: dto.driving_license_number }),
      },
      update: {
        ...(dto.aadhaar_number !== undefined && { aadhaar_number: dto.aadhaar_number }),
        ...(dto.driving_license_number !== undefined && {
          driving_license_number: dto.driving_license_number,
        }),
      },
    });

    this.logger.log(`Document numbers updated: userId=${userId}`);

    return record;
  }

  // ─── Create or Update (generic upsert) ───────────────────────────────────────

  async createOrUpdate(userId: string, data: Record<string, unknown>) {
    return this.prisma.userDocument.upsert({
      where: { user_id: userId },
      create: { user_id: userId, ...data },
      update: { ...data },
    });
  }

  // ─── Cloudinary Upload Helper ─────────────────────────────────────────────────

  private uploadBufferToCloudinary(
    buffer: Buffer,
    userId: string,
    docType: DocumentType,
    mimetype: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // PDFs must be uploaded as raw; images as image resource type
      const resourceType: 'image' | 'raw' = mimetype === 'application/pdf' ? 'raw' : 'image';

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `buddyride/documents/${userId}`,
          public_id: docType,
          overwrite: true,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(
              `Cloudinary document upload failed: userId=${userId}, type=${docType}`,
              error,
            );
            reject(
              new InternalServerErrorException(
                'Failed to upload document. Please try again.',
              ),
            );
            return;
          }
          resolve(result.secure_url);
        },
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }
}
