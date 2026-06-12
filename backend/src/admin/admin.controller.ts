import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { PricingService } from '../pricing/pricing.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { UpdatePricingAdminDto } from './dto/update-pricing-admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly pricingService: PricingService,
  ) {}

  // ─── GET /admin/dashboard ─────────────────────────────────────────────────────

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get platform dashboard stats (admin only)',
    description:
      'Returns aggregate platform statistics: user counts, ride counts, ' +
      'revenue totals, active subscriptions and open reports.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard stats returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── GET /admin/users ─────────────────────────────────────────────────────────

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all users with pagination and filtering (admin only)',
    description:
      'Returns a paginated list of users. Supports free-text search over ' +
      'name, email and phone, plus filters by role and status.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, email or phone',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['guest', 'host', 'admin'],
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'suspended', 'verified', 'unverified'],
    description: 'Filter by account status',
  })
  @ApiResponse({ status: 200, description: 'Paginated user list returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getUsers(page, limit, search, role, status);
  }

  // ─── PATCH /admin/users/:id/suspend ──────────────────────────────────────────

  @Patch('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend a user (admin only)',
    description:
      'Sets is_suspended=true on the target user, records an audit log entry ' +
      'and returns the updated user object.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the user to suspend' })
  @ApiResponse({ status: 200, description: 'User suspended successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async suspendUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.adminService.suspendUser(userId, adminId, dto.reason);
  }

  // ─── PATCH /admin/users/:id/activate ─────────────────────────────────────────

  @Patch('users/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate (un-suspend) a user (admin only)',
    description:
      'Sets is_suspended=false on the target user, records an audit log entry ' +
      'and returns the updated user object.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the user to activate' })
  @ApiResponse({ status: 200, description: 'User activated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async activateUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.activateUser(userId, adminId);
  }

  // ─── GET /admin/documents ─────────────────────────────────────────────────────

  @Get('documents')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List pending user documents (admin only)',
    description:
      'Returns a paginated list of UserDocument records that are awaiting review.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated pending documents returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getPendingDocuments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getPendingDocuments(page, limit);
  }

  // ─── PATCH /admin/documents/:id/approve ──────────────────────────────────────

  @Patch('documents/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve a user document (admin only)',
    description:
      'Marks the document as approved, sets the owner user as verified, ' +
      'creates an audit log and sends the user a notification.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the document to approve' })
  @ApiResponse({ status: 200, description: 'Document approved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  async approveDocument(
    @Param('id', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.approveDocument(documentId, adminId);
  }

  // ─── PATCH /admin/documents/:id/reject ───────────────────────────────────────

  @Patch('documents/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject a user document (admin only)',
    description:
      'Marks the document as rejected with the supplied reason, creates an ' +
      'audit log and notifies the user.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the document to reject' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason'],
      properties: {
        reason: {
          type: 'string',
          minLength: 5,
          example: 'Aadhaar image is blurry and unreadable.',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Document rejected.' })
  @ApiResponse({ status: 400, description: 'reason is required.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  async rejectDocument(
    @Param('id', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') adminId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.rejectDocument(documentId, adminId, reason);
  }

  // ─── PATCH /admin/pricing ─────────────────────────────────────────────────────

  @Patch('pricing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update platform pricing (admin only)',
    description:
      'Updates all pricing rates in a single call. Snapshots the previous ' +
      'per_km_rate into pricing history and writes a full audit log entry.',
  })
  @ApiResponse({ status: 200, description: 'Pricing updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async updatePricing(
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdatePricingAdminDto,
  ) {
    return this.pricingService.updatePricing(adminId, dto);
  }

  // ─── GET /admin/pricing/history ───────────────────────────────────────────────

  @Get('pricing/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get pricing change history (admin only)',
    description: 'Returns a paginated list of historical per-km rate changes.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated pricing history returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getPricingHistory(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.pricingService.getPricingHistory(page, limit);
  }

  // ─── GET /admin/branding ──────────────────────────────────────────────────────

  @Get('branding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get platform branding config (admin only)',
    description:
      'Returns the current branding configuration (logo, primary colour, ' +
      'navbar links). Creates a default record if none exists.',
  })
  @ApiResponse({ status: 200, description: 'Branding config returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getBranding() {
    return this.adminService.getBranding();
  }

  // ─── PATCH /admin/branding ────────────────────────────────────────────────────

  @Patch('branding')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update platform branding (admin only)',
    description:
      'Upserts the branding configuration. Only provided fields are updated. ' +
      'Creates an audit log entry for traceability.',
  })
  @ApiResponse({ status: 200, description: 'Branding updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async updateBranding(
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    return this.adminService.updateBranding(adminId, dto);
  }

  // ─── GET /admin/subscriptions ─────────────────────────────────────────────────

  @Get('subscriptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List subscriptions (admin only)',
    description:
      'Returns a paginated list of all subscriptions with user info, ' +
      'optionally filtered by plan_type.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'plan_type',
    required: false,
    type: String,
    description: 'Filter by plan type (e.g. "7d", "15d", "30d")',
  })
  @ApiResponse({ status: 200, description: 'Paginated subscriptions returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getSubscriptions(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('plan_type') plan_type?: string,
  ) {
    return this.adminService.getSubscriptions(page, limit, plan_type);
  }

  // ─── GET /admin/audit-logs ────────────────────────────────────────────────────

  @Get('audit-logs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List audit logs (admin only)',
    description:
      'Returns a paginated list of all audit log entries, newest first, ' +
      'with the acting user included.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated audit logs returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  async getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getAuditLogs(page, limit);
  }
}
