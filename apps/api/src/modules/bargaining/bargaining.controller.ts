import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BargainingService } from './bargaining.service';
import { SupabaseAuthGuard } from '../../supabase/guards/supabase-auth.guard';
import { CurrentUser } from '../../supabase/decorators/current-user.decorator';
import { UserProfile } from '@paridhan/types';
import {
  BargainingSessionCreateDto,
  BargainingOfferSubmitDto,
  BargainingActionDto,
} from '@paridhan/validation';

@ApiTags('Bargaining')
@Controller('bargaining')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BargainingController {
  constructor(private readonly bargainingService: BargainingService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Initiate a structured bargaining session on a product variant' })
  async createSession(
    @CurrentUser() user: UserProfile,
    @Body() body: BargainingSessionCreateDto,
  ) {
    return this.bargainingService.createSession(user.id, body);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List bargaining sessions for current user or seller shops' })
  async listSessions(@CurrentUser() user: UserProfile) {
    if (user.role === 'SELLER') {
      return this.bargainingService.listShopSessions(user.id);
    }
    return this.bargainingService.listUserSessions(user.id);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get bargaining session with offer timeline and privacy protection' })
  async getSession(@CurrentUser() user: UserProfile, @Param('id') id: string) {
    return this.bargainingService.getSessionWithOffers(id, user.id, user.role);
  }

  @Post('sessions/:id/offers')
  @ApiOperation({ summary: 'Submit counter-offer in an open bargaining session' })
  async submitOffer(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
    @Body() body: BargainingOfferSubmitDto,
  ) {
    return this.bargainingService.submitCounterOffer(id, user.id, user.role, body);
  }

  @Post('sessions/:id/accept')
  @ApiOperation({ summary: 'Accept the current offer to set authoritative agreed price' })
  async acceptOffer(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
    @Body() body: BargainingActionDto,
  ) {
    return this.bargainingService.acceptOffer(id, user.id, user.role, body);
  }

  @Post('sessions/:id/reject')
  @ApiOperation({ summary: 'Reject negotiation and close bargaining session' })
  async rejectOffer(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
    @Body() body: BargainingActionDto,
  ) {
    return this.bargainingService.rejectOffer(id, user.id, user.role, body);
  }

  @Post('sessions/:id/cancel')
  @ApiOperation({ summary: 'Cancel bargaining session by consumer' })
  async cancelSession(
    @CurrentUser() user: UserProfile,
    @Param('id') id: string,
  ) {
    return this.bargainingService.cancelSession(id, user.id);
  }
}
