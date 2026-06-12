import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── GET /notifications ───────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Get notifications for the current user',
    description:
      'Returns a paginated list of notifications for the authenticated user, ' +
      'ordered by most recent first. Also includes the total unread count.',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page (default: 20)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated notifications returned successfully.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page !== undefined ? parseInt(page, 10) : 1;
    const limitNum = limit !== undefined ? parseInt(limit, 10) : 20;

    return this.notificationsService.getNotifications(
      userId,
      isNaN(pageNum) || pageNum < 1 ? 1 : pageNum,
      isNaN(limitNum) || limitNum < 1 ? 20 : limitNum,
    );
  }

  // ─── GET /notifications/unread-count ─────────────────────────────────────────

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description:
      'Returns the total number of unread notifications for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread count returned successfully.',
    schema: {
      type: 'object',
      properties: {
        unread_count: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  // ─── PATCH /notifications/read-all ───────────────────────────────────────────

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description:
      'Sets is_read = true on every unread notification for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'All unread notifications marked as read.',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  // ─── PATCH /notifications/:id/read ───────────────────────────────────────────

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a single notification as read',
    description:
      'Sets is_read = true on a specific notification owned by the authenticated user.',
  })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — notification belongs to another user.',
  })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async markAsRead(
    @Param('id', ParseUuidPipe) notificationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, userId);
  }
}
