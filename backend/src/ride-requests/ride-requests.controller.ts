import {
  Controller,
  Post,
  Patch,
  Get,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';
import { RideRequestsService } from './ride-requests.service';
import { CreateRequestDto } from './dto/create-request.dto';

@ApiTags('Ride Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rides')
export class RideRequestsController {
  constructor(private readonly rideRequestsService: RideRequestsService) {}

  // ─── POST /rides/:rideId/request ─────────────────────────────────────────────
  // Guest submits a request to join a ride.

  @Post(':rideId/request')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request to join a ride',
    description:
      'Allows an authenticated guest to request a seat on an open ride. ' +
      'Custom pickup/dropoff coordinates are optional — when omitted the ride origin/destination are used.',
  })
  @ApiParam({ name: 'rideId', description: 'UUID of the ride' })
  @ApiResponse({ status: 201, description: 'Request created successfully.' })
  @ApiResponse({ status: 400, description: 'Guest is the host, or invalid input.' })
  @ApiResponse({ status: 404, description: 'Ride not found or not open.' })
  @ApiResponse({ status: 409, description: 'Duplicate active request exists.' })
  async requestToJoin(
    @Param('rideId', ParseUuidPipe) rideId: string,
    @CurrentUser('id') guestId: string,
    @Body() dto: CreateRequestDto,
  ) {
    // Ensure the ride_id in the body always matches the route param
    dto.ride_id = rideId;
    return this.rideRequestsService.createRequest(guestId, dto);
  }

  // ─── PATCH /rides/:rideId/requests/:requestId/accept ─────────────────────────
  // Host accepts a pending request.

  @Patch(':rideId/requests/:requestId/accept')
  @ApiOperation({
    summary: 'Accept a ride request',
    description:
      'Host accepts a pending request. Decrements available seats; ' +
      'sets ride status to "full" and auto-rejects remaining pending requests when no seats remain.',
  })
  @ApiParam({ name: 'rideId', description: 'UUID of the ride' })
  @ApiParam({ name: 'requestId', description: 'UUID of the request to accept' })
  @ApiResponse({ status: 200, description: 'Request accepted successfully.' })
  @ApiResponse({ status: 400, description: 'Request not pending or ride is full.' })
  @ApiResponse({ status: 403, description: 'Caller is not the ride host.' })
  @ApiResponse({ status: 404, description: 'Ride or request not found.' })
  async acceptRequest(
    @Param('rideId', ParseUuidPipe) rideId: string,
    @Param('requestId', ParseUuidPipe) requestId: string,
    @CurrentUser('id') hostId: string,
  ) {
    return this.rideRequestsService.acceptRequest(rideId, requestId, hostId);
  }

  // ─── PATCH /rides/:rideId/requests/:requestId/reject ─────────────────────────
  // Host rejects a pending request.

  @Patch(':rideId/requests/:requestId/reject')
  @ApiOperation({
    summary: 'Reject a ride request',
    description: 'Host rejects a pending request and notifies the guest.',
  })
  @ApiParam({ name: 'rideId', description: 'UUID of the ride' })
  @ApiParam({ name: 'requestId', description: 'UUID of the request to reject' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully.' })
  @ApiResponse({ status: 400, description: 'Request is not in a pending state.' })
  @ApiResponse({ status: 403, description: 'Caller is not the ride host.' })
  @ApiResponse({ status: 404, description: 'Ride or request not found.' })
  async rejectRequest(
    @Param('rideId', ParseUuidPipe) rideId: string,
    @Param('requestId', ParseUuidPipe) requestId: string,
    @CurrentUser('id') hostId: string,
  ) {
    return this.rideRequestsService.rejectRequest(rideId, requestId, hostId);
  }

  // ─── GET /rides/:rideId/requests ─────────────────────────────────────────────
  // Host retrieves all requests for their ride.

  @Get(':rideId/requests')
  @ApiOperation({
    summary: 'List all requests for a ride',
    description:
      'Returns every request (in any status) submitted for the specified ride. ' +
      'Restricted to the ride host.',
  })
  @ApiParam({ name: 'rideId', description: 'UUID of the ride' })
  @ApiResponse({ status: 200, description: 'Requests returned successfully.' })
  @ApiResponse({ status: 403, description: 'Caller is not the ride host.' })
  @ApiResponse({ status: 404, description: 'Ride not found.' })
  async getRideRequests(
    @Param('rideId', ParseUuidPipe) rideId: string,
    @CurrentUser('id') hostId: string,
  ) {
    return this.rideRequestsService.getRequestsForRide(rideId, hostId);
  }

  // ─── GET /rides/requests/my ───────────────────────────────────────────────────
  // Guest retrieves all their own requests.
  // NOTE: This route must appear BEFORE `:rideId/requests/:requestId` to avoid
  //       being shadowed by the parametric path.

  @Get('requests/my')
  @ApiOperation({
    summary: 'List my ride requests',
    description:
      'Returns all requests submitted by the currently authenticated guest, ' +
      'ordered by most recent first.',
  })
  @ApiResponse({ status: 200, description: 'Guest requests returned successfully.' })
  async getMyRequests(@CurrentUser('id') guestId: string) {
    return this.rideRequestsService.getGuestRequests(guestId);
  }

  // ─── DELETE /rides/requests/:requestId ───────────────────────────────────────
  // Guest cancels their own pending or accepted request.

  @Delete('requests/:requestId')
  @ApiOperation({
    summary: 'Cancel a ride request',
    description:
      'Guest cancels their own request. Only "pending" or "accepted" requests can be cancelled. ' +
      'Cancelling an accepted request restores the seat to the ride.',
  })
  @ApiParam({ name: 'requestId', description: 'UUID of the request to cancel' })
  @ApiResponse({ status: 200, description: 'Request cancelled successfully.' })
  @ApiResponse({ status: 400, description: 'Request cannot be cancelled in its current status.' })
  @ApiResponse({ status: 403, description: 'Caller did not make this request.' })
  @ApiResponse({ status: 404, description: 'Request not found.' })
  async cancelRequest(
    @Param('requestId', ParseUuidPipe) requestId: string,
    @CurrentUser('id') guestId: string,
  ) {
    return this.rideRequestsService.cancelRequest(requestId, guestId);
  }
}
