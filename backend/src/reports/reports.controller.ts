import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { ReportsService, ResolveReportDto } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ─── POST /reports ────────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a report',
    description:
      'Creates a new report against a user, a ride, or both. ' +
      'The authenticated user is recorded as the reporter. ' +
      'A reporter cannot report themselves.',
  })
  @ApiResponse({ status: 201, description: 'Report submitted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Neither reported_user_id nor reported_ride_id provided.',
  })
  @ApiResponse({
    status: 403,
    description: 'Reporter attempted to report themselves.',
  })
  @ApiResponse({ status: 404, description: 'Target user or ride not found.' })
  async createReport(
    @CurrentUser('id') reporterId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(reporterId, dto);
  }

  // ─── GET /reports/my ─────────────────────────────────────────────────────────

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get the current user's submitted reports",
    description:
      'Returns all reports that have been submitted by the authenticated user, ' +
      'ordered by creation date descending.',
  })
  @ApiResponse({ status: 200, description: 'Reports returned successfully.' })
  async getMyReports(@CurrentUser('id') userId: string) {
    return this.reportsService.getMyReports(userId);
  }

  // ─── GET /reports (admin) ─────────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all reports (admin only)',
    description:
      'Returns paginated reports. Admins may filter by status. ' +
      'Results are ordered by creation date descending.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: 'Results per page (default: 20)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    example: 'open',
    description:
      'Filter by report status: open | under_review | resolved | dismissed',
  })
  @ApiResponse({ status: 200, description: 'Paginated reports returned.' })
  @ApiResponse({ status: 403, description: 'Admin access required.' })
  async getAllReports(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.reportsService.getAllReports(page, limit, status);
  }

  // ─── PATCH /reports/:reportId/resolve (admin) ─────────────────────────────────

  @Patch(':reportId/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.admin)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resolve or dismiss a report (admin only)',
    description:
      'Updates a report status to resolved or dismissed. Creates an audit log ' +
      'entry attributed to the acting admin. An optional resolution_note is ' +
      'appended to the report description.',
  })
  @ApiParam({ name: 'reportId', description: 'UUID of the report' })
  @ApiResponse({ status: 200, description: 'Report resolved successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Report is already resolved or dismissed.',
  })
  @ApiResponse({ status: 403, description: 'Admin access required.' })
  @ApiResponse({ status: 404, description: 'Report not found.' })
  async resolveReport(
    @Param('reportId', ParseUuidPipe) reportId: string,
    @CurrentUser('id') adminId: string,
    @Body() resolution: ResolveReportDto,
  ) {
    return this.reportsService.resolveReport(reportId, adminId, resolution);
  }
}
