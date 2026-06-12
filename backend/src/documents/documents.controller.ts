import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  DocumentsService,
  DocumentType,
  UpdateDocumentNumbersDto,
} from './documents.service';

// ─── DTO ──────────────────────────────────────────────────────────────────────

class UpdateDocumentNumbersBodyDto implements UpdateDocumentNumbersDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{12}$/, { message: 'aadhaar_number must be a 12-digit number.' })
  aadhaar_number?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}\d{13}$/, {
    message:
      'driving_license_number must match the format: 2 uppercase letters followed by 13 digits.',
  })
  driving_license_number?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_DOCUMENT_MIME = /^(image\/(jpeg|png)|application\/pdf)$/;
const VALID_DOCUMENT_TYPES: DocumentType[] = [
  'aadhaar',
  'driving_license',
  'vehicle_rc',
  'insurance',
];

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ─── POST /documents/upload/:type ─────────────────────────────────────────────

  @Post('upload/:type')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'type',
    enum: ['aadhaar', 'driving_license', 'vehicle_rc', 'insurance'],
    description: 'Document type to upload',
  })
  @ApiBody({
    description: 'Document file (JPEG, PNG, or PDF — max 5 MB)',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Upload a KYC document',
    description:
      'Uploads a single KYC document (Aadhaar, Driving License, Vehicle RC, or Insurance) ' +
      'to Cloudinary. Accepted formats: JPEG, PNG, PDF (max 5 MB). ' +
      'If the document was previously rejected the status is automatically reset to pending.',
  })
  @ApiResponse({ status: 200, description: 'Document uploaded successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid document type, missing file, or file validation failed.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 422, description: 'File too large or unsupported MIME type.' })
  async uploadDocument(
    @CurrentUser('id') userId: string,
    @Param('type') type: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_DOCUMENT_SIZE_BYTES }),
          new FileTypeValidator({ fileType: ALLOWED_DOCUMENT_MIME }),
        ],
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!VALID_DOCUMENT_TYPES.includes(type as DocumentType)) {
      throw new BadRequestException(
        `Invalid document type "${type}". Allowed: ${VALID_DOCUMENT_TYPES.join(', ')}.`,
      );
    }

    return this.documentsService.uploadDocument(userId, type as DocumentType, file);
  }

  // ─── GET /documents/status ────────────────────────────────────────────────────

  @Get('status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get own document verification status',
    description:
      'Returns the UserDocument record for the authenticated user including all uploaded URLs, ' +
      'document numbers, and current verification status.',
  })
  @ApiResponse({ status: 200, description: 'Document status returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getDocumentStatus(@CurrentUser('id') userId: string) {
    return this.documentsService.getDocumentStatus(userId);
  }

  // ─── PATCH /documents/numbers ─────────────────────────────────────────────────

  @Patch('numbers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update document identification numbers',
    description:
      'Updates the Aadhaar number (12 digits) and/or Driving License number for the authenticated user. ' +
      'At least one field must be provided.',
  })
  @ApiResponse({ status: 200, description: 'Document numbers updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error or no fields provided.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async updateDocumentNumbers(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDocumentNumbersBodyDto,
  ) {
    return this.documentsService.updateDocumentNumbers(userId, dto);
  }
}
