import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SwitchModeDto } from './dto/switch-mode.dto';

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── GET /users/profile ───────────────────────────────────────────────────────

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get authenticated user profile',
    description:
      'Returns the full profile of the currently authenticated user, including documents, active vehicles, and active subscription.',
  })
  @ApiResponse({ status: 200, description: 'Profile returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  // ─── PATCH /users/profile ─────────────────────────────────────────────────────

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user profile',
    description:
      'Updates one or more profile fields (name, email, profile_photo). If profile_photo is a base64 data URI it will be uploaded to Cloudinary automatically.',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  // ─── PATCH /users/switch-mode ─────────────────────────────────────────────────

  @Patch('switch-mode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Switch active mode',
    description: "Toggles the user's active_mode between 'guest' and 'host'.",
  })
  @ApiResponse({ status: 200, description: 'Mode switched successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid mode value.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async switchMode(
    @CurrentUser('id') userId: string,
    @Body() dto: SwitchModeDto,
  ) {
    return this.usersService.switchMode(userId, dto);
  }

  // ─── POST /users/profile/photo ────────────────────────────────────────────────

  @Post('profile/photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Profile photo upload (JPEG, PNG, WebP — max 5 MB)',
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['photo'],
    },
  })
  @ApiOperation({
    summary: 'Upload profile photo',
    description:
      'Uploads a profile photo via multipart/form-data (field name: "photo"). The image is stored in Cloudinary under buddyride/profiles and the user record is updated with the returned URL.',
  })
  @ApiResponse({ status: 200, description: 'Photo uploaded successfully.', schema: { example: { url: 'https://res.cloudinary.com/...' } } })
  @ApiResponse({ status: 400, description: 'Missing or invalid file.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async uploadProfilePhoto(
    @CurrentUser('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_PHOTO_SIZE_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      }),
    )
    file: Express.Multer.File,
  ) {
    const url = await this.usersService.uploadProfilePhoto(userId, file);
    return { url };
  }
}
