import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SwitchModeDto } from './dto/switch-mode.dto';

// Fields excluded from every outbound user payload
const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  profile_photo: true,
  role: true,
  active_mode: true,
  is_verified: true,
  is_suspended: true,
  created_at: true,
  updated_at: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Configure the Cloudinary SDK with credentials from environment
    cloudinary.config({
      cloud_name: this.configService.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow<string>('CLOUDINARY_API_SECRET'),
    });
  }

  // ─── Find by ID ───────────────────────────────────────────────────────────────

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found.`);
    }
    return user;
  }

  // ─── Find by Phone ────────────────────────────────────────────────────────────

  async findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  // ─── Get Profile ──────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...SAFE_USER_SELECT,
        documents: true,
        vehicles: {
          where: { status: 'active' },
          orderBy: { created_at: 'desc' },
        },
        subscriptions: {
          where: {
            status: 'active',
            ends_at: { gt: new Date() },
          },
          orderBy: { started_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with id "${userId}" not found.`);
    }

    return {
      ...user,
      active_subscription: user.subscriptions[0] ?? null,
      subscriptions: undefined,
    };
  }

  // ─── Update Profile ───────────────────────────────────────────────────────────

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Ensure user exists
    await this.findById(userId);

    let resolvedPhotoUrl: string | undefined = dto.profile_photo;

    // If profile_photo looks like a base64 data URI, upload it to Cloudinary
    if (dto.profile_photo && dto.profile_photo.startsWith('data:')) {
      resolvedPhotoUrl = await this.uploadBase64ToCloudinary(
        dto.profile_photo,
        userId,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(resolvedPhotoUrl !== undefined && { profile_photo: resolvedPhotoUrl }),
      },
      select: SAFE_USER_SELECT,
    });

    return updated;
  }

  // ─── Switch Mode ──────────────────────────────────────────────────────────────

  async switchMode(userId: string, dto: SwitchModeDto) {
    await this.findById(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { active_mode: dto.mode },
      select: SAFE_USER_SELECT,
    });
  }

  // ─── Upload Profile Photo ─────────────────────────────────────────────────────

  async uploadProfilePhoto(userId: string, file: Express.Multer.File): Promise<string> {
    await this.findById(userId);

    const url = await this.uploadBufferToCloudinary(file.buffer, userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { profile_photo: url },
    });

    return url;
  }

  // ─── Get Active Subscription ──────────────────────────────────────────────────

  async getActiveSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        user_id: userId,
        status: 'active',
        ends_at: { gt: new Date() },
      },
      orderBy: { started_at: 'desc' },
    });
  }

  // ─── Cloudinary Helpers ───────────────────────────────────────────────────────

  /**
   * Upload a Buffer to Cloudinary using upload_stream.
   * Returns the secure URL of the uploaded asset.
   */
  private uploadBufferToCloudinary(
    buffer: Buffer,
    userId: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'buddyride/profiles',
          public_id: `user_${userId}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload failed', error);
            reject(
              new InternalServerErrorException(
                'Failed to upload profile photo. Please try again.',
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

  /**
   * Upload a base64 data URI to Cloudinary.
   * Returns the secure URL of the uploaded asset.
   */
  private async uploadBase64ToCloudinary(
    base64DataUri: string,
    userId: string,
  ): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(base64DataUri, {
        folder: 'buddyride/profiles',
        public_id: `user_${userId}`,
        overwrite: true,
        resource_type: 'image',
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
      });
      return result.secure_url;
    } catch (error: any) {
      this.logger.error('Cloudinary base64 upload failed', error?.message);
      throw new InternalServerErrorException(
        'Failed to upload profile photo. Please try again.',
      );
    }
  }
}
