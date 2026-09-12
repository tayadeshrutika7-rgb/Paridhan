import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { UserRole, BargainingStatus, OfferStatus } from '@paridhan/types';
import {
  BargainingSessionCreateDto,
  BargainingOfferSubmitDto,
  BargainingActionDto,
} from '@paridhan/validation';

@Injectable()
export class BargainingService {
  private readonly logger = new Logger(BargainingService.name);
  private readonly sessionExpiryHours = 24;
  private readonly maxOffersPerSession = 10;

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Initiate a structured bargaining session with initial consumer offer
   */
  async createSession(
    userId: string,
    dtoOrProductId: BargainingSessionCreateDto | string,
    variantIdArg?: string,
    initialOfferArg?: number,
    messageArg?: string,
  ) {
    const dto: BargainingSessionCreateDto =
      typeof dtoOrProductId === 'string'
        ? {
            productId: dtoOrProductId,
            variantId: variantIdArg!,
            initialOffer: initialOfferArg!,
            message: messageArg,
          }
        : dtoOrProductId;

    const { productId, variantId, initialOffer, message } = dto;

    // 1. Fetch and validate product
    const { data: product, error: prodErr } = await this.supabase.admin
      .from('products')
      .select('id, name, shop_id, base_price, status, is_bargaining_allowed, min_bargain_price, shops(id, seller_id, name, status)')
      .eq('id', productId)
      .maybeSingle();

    if (prodErr || !product) {
      throw new NotFoundException('Product not found');
    }

    if (product.status !== 'ACTIVE') {
      throw new BadRequestException('Product is not active');
    }

    if (!product.is_bargaining_allowed) {
      throw new BadRequestException('Bargaining is not enabled for this product');
    }

    const shop = (product as any).shops;
    if (shop?.status === 'SUSPENDED' || shop?.status === 'REJECTED') {
      throw new BadRequestException('Shop is currently unavailable');
    }

    // 2. Fetch and validate variant
    const { data: variant, error: varErr } = await this.supabase.admin
      .from('product_variants')
      .select('id, sku, price, stock_quantity, is_active')
      .eq('id', variantId)
      .maybeSingle();

    if (varErr || !variant) {
      throw new NotFoundException('Variant not found');
    }

    if (!variant.is_active || variant.stock_quantity <= 0) {
      throw new BadRequestException('Selected variant is out of stock or inactive');
    }

    const originalPrice = variant.price;

    // 3. Validate initial offer amount
    if (initialOffer <= 0) {
      throw new BadRequestException('Initial offer must be greater than ₹0');
    }

    if (initialOffer >= originalPrice) {
      throw new BadRequestException(
        `Initial offer (₹${initialOffer}) must be lower than the listed price (₹${originalPrice})`,
      );
    }

    // Optional floor price check if configured on product
    if (product.min_bargain_price && initialOffer < product.min_bargain_price * 0.5) {
      throw new BadRequestException(
        'Offer is too low to be considered. Please provide a reasonable offer.',
      );
    }

    // 4. Check for existing active session for this user and variant
    const { data: existingSessions } = await this.supabase.admin
      .from('bargaining_sessions')
      .select('id, status, expires_at')
      .eq('user_id', userId)
      .eq('variant_id', variantId)
      .eq('status', 'OPEN');

    const activeSession = existingSessions?.find(
      (s) => new Date(s.expires_at) > new Date(),
    );

    if (activeSession) {
      return this.getSessionWithOffers(activeSession.id, userId, 'CONSUMER');
    }

    // 5. Create new session
    const expiresAt = new Date(
      Date.now() + this.sessionExpiryHours * 3600 * 1000,
    ).toISOString();

    const { data: session, error: sessErr } = await this.supabase.admin
      .from('bargaining_sessions')
      .insert({
        product_id: productId,
        variant_id: variantId,
        user_id: userId,
        shop_id: product.shop_id,
        original_price: originalPrice,
        status: 'OPEN' as BargainingStatus,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (sessErr) throw sessErr;

    // 6. Insert initial offer
    await this.supabase.admin.from('bargaining_offers').insert({
      session_id: session.id,
      sender_id: userId,
      sender_role: 'CONSUMER' as UserRole,
      amount: initialOffer,
      message: message ?? null,
      status: 'PENDING' as OfferStatus,
    });

    return this.getSessionWithOffers(session.id, userId, 'CONSUMER');
  }

  /**
   * Get bargaining session with complete offer history and privacy protection
   */
  async getSessionWithOffers(sessionId: string, userId: string, role: UserRole = 'CONSUMER') {
    const { data: rawSession, error } = await this.supabase.admin
      .from('bargaining_sessions')
      .select(`
        *,
        bargaining_offers (*),
        products (id, name, slug, base_price, status, min_bargain_price),
        product_variants (id, sku, size, color, price, stock_quantity, is_active),
        shops (id, seller_id, name, city)
      `)
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !rawSession) {
      throw new NotFoundException('Bargaining session not found');
    }

    const session = rawSession as any;
    const shop = session.shops;

    // Ownership validation
    if (role === 'CONSUMER' && session.user_id !== userId) {
      throw new ForbiddenException('You do not have permission to view this bargaining session');
    }

    if (role === 'SELLER' && shop?.seller_id !== userId) {
      throw new ForbiddenException('You do not have permission to view negotiations for other shops');
    }

    // Expiration check: if OPEN and past expiry, transition to EXPIRED
    if (session.status === 'OPEN' && new Date() > new Date(session.expires_at)) {
      await this.supabase.admin
        .from('bargaining_sessions')
        .update({ status: 'EXPIRED' as BargainingStatus, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      session.status = 'EXPIRED';
    }

    // Sort offers chronologically
    if (session.bargaining_offers) {
      session.bargaining_offers.sort(
        (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }

    // Privacy Protection: NEVER leak seller's private min_bargain_price to consumer
    if (role === 'CONSUMER' && session.products) {
      delete session.products.min_bargain_price;
    }

    return session;
  }

  /**
   * List sessions for a consumer
   */
  async listUserSessions(userId: string) {
    const { data, error } = await this.supabase.admin
      .from('bargaining_sessions')
      .select(`
        *,
        bargaining_offers (*),
        products (id, name, slug, base_price),
        product_variants (id, sku, size, color, price),
        shops (id, name, city)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * List sessions for a seller's shops
   */
  async listShopSessions(sellerId: string) {
    const { data: shops } = await this.supabase.admin
      .from('shops')
      .select('id')
      .eq('seller_id', sellerId);

    const shopIds = shops?.map((s) => s.id) || [];
    if (shopIds.length === 0) return [];

    const { data, error } = await this.supabase.admin
      .from('bargaining_sessions')
      .select(`
        *,
        bargaining_offers (*),
        products (id, name, slug, base_price),
        product_variants (id, sku, size, color, price),
        shops (id, name, city)
      `)
      .in('shop_id', shopIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Submit a counter-offer in an active bargaining session
   */
  async submitCounterOffer(
    sessionId: string,
    senderId: string,
    role: UserRole,
    dto: BargainingOfferSubmitDto,
  ) {
    const { amount, message } = dto;
    const session = await this.getSessionWithOffers(sessionId, senderId, role);

    // 1. Session state checks
    if (session.status !== 'OPEN') {
      throw new BadRequestException(`Cannot make counter-offer. Bargaining session is ${session.status.toLowerCase()}.`);
    }

    if (new Date() > new Date(session.expires_at)) {
      throw new BadRequestException('Cannot make counter-offer. Bargaining session has expired.');
    }

    const offers = (session.bargaining_offers || []) as any[];

    if (offers.length >= this.maxOffersPerSession) {
      throw new BadRequestException('Maximum negotiation attempts reached for this session.');
    }

    // 2. Turn validation: cannot make two consecutive offers
    const lastOffer = offers[offers.length - 1];
    if (lastOffer && lastOffer.sender_id === senderId) {
      throw new BadRequestException(
        'Please wait for the other party to respond before submitting another counter-offer.',
      );
    }

    // 3. Monotonic price progression validation
    const originalPrice = session.original_price;
    const buyerOffers = offers.filter((o) => o.sender_role === 'CONSUMER').map((o) => o.amount);
    const sellerOffers = offers.filter((o) => o.sender_role === 'SELLER').map((o) => o.amount);

    const highestBuyerOffer = buyerOffers.length > 0 ? Math.max(...buyerOffers) : 0;
    const lowestSellerOffer = sellerOffers.length > 0 ? Math.min(...sellerOffers) : originalPrice;

    if (amount <= 0) {
      throw new BadRequestException('Counter-offer amount must be positive.');
    }

    if (role === 'CONSUMER') {
      if (amount <= highestBuyerOffer) {
        throw new BadRequestException(
          `Your counter-offer (₹${amount}) must be higher than your previous offer (₹${highestBuyerOffer}).`,
        );
      }
      if (amount >= lowestSellerOffer) {
        throw new BadRequestException(
          `Your counter-offer (₹${amount}) must be lower than the seller's counter (₹${lowestSellerOffer}). Use accept if you agree.`,
        );
      }
    } else if (role === 'SELLER') {
      if (amount >= lowestSellerOffer) {
        throw new BadRequestException(
          `Your counter-offer (₹${amount}) must be lower than your previous counter (₹${lowestSellerOffer}).`,
        );
      }
      if (amount <= highestBuyerOffer) {
        throw new BadRequestException(
          `Your counter-offer (₹${amount}) must be higher than the buyer's offer (₹${highestBuyerOffer}). Use accept if you agree.`,
        );
      }
    }

    // 4. Mark previous pending offers as COUNTERED
    await this.supabase.admin
      .from('bargaining_offers')
      .update({ status: 'COUNTERED' as OfferStatus })
      .eq('session_id', sessionId)
      .eq('status', 'PENDING');

    // 5. Insert new offer
    const { data: newOffer, error: offErr } = await this.supabase.admin
      .from('bargaining_offers')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        sender_role: role,
        amount,
        message: message ?? null,
        status: 'PENDING' as OfferStatus,
      })
      .select()
      .single();

    if (offErr) throw offErr;
    return newOffer;
  }

  /**
   * Accept an offer to conclude negotiation and record authoritative agreed price
   */
  async acceptOffer(sessionId: string, userId: string, role: UserRole, dto?: BargainingActionDto) {
    const session = await this.getSessionWithOffers(sessionId, userId, role);

    if (session.status !== 'OPEN') {
      throw new BadRequestException(`Cannot accept. Bargaining session is ${session.status.toLowerCase()}.`);
    }

    if (new Date() > new Date(session.expires_at)) {
      throw new BadRequestException('Cannot accept. Bargaining session has expired.');
    }

    const offers = (session.bargaining_offers || []) as any[];
    if (offers.length === 0) {
      throw new BadRequestException('No offers found in this session.');
    }

    // Find target offer to accept
    const targetOffer = dto?.offerId
      ? offers.find((o) => o.id === dto.offerId)
      : offers[offers.length - 1];

    if (!targetOffer) {
      throw new NotFoundException('Target offer to accept was not found.');
    }

    // Security rule: Party cannot accept their own offer
    if (targetOffer.sender_id === userId) {
      throw new BadRequestException('You cannot accept your own offer. Please wait for the other party to accept.');
    }

    const agreedPrice = targetOffer.amount;

    // 1. Update session to ACCEPTED with agreed price
    const { data: updatedSession, error: sessErr } = await this.supabase.admin
      .from('bargaining_sessions')
      .update({
        status: 'ACCEPTED' as BargainingStatus,
        agreed_price: agreedPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (sessErr) throw sessErr;

    // 2. Mark accepted offer as ACCEPTED
    await this.supabase.admin
      .from('bargaining_offers')
      .update({ status: 'ACCEPTED' as OfferStatus })
      .eq('id', targetOffer.id);

    return {
      success: true,
      sessionId: updatedSession.id,
      status: 'ACCEPTED',
      agreedPrice,
      message: `Offer of ₹${agreedPrice} accepted successfully. You can now add this item to your cart and checkout at the negotiated price.`,
    };
  }

  /**
   * Reject negotiation
   */
  async rejectOffer(sessionId: string, userId: string, role: UserRole, dto?: BargainingActionDto) {
    const session = await this.getSessionWithOffers(sessionId, userId, role);

    if (session.status !== 'OPEN') {
      throw new BadRequestException(`Cannot reject. Bargaining session is ${session.status.toLowerCase()}.`);
    }

    // Update session to REJECTED
    const { data: updatedSession, error: sessErr } = await this.supabase.admin
      .from('bargaining_sessions')
      .update({
        status: 'REJECTED' as BargainingStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (sessErr) throw sessErr;

    // Mark pending offers as REJECTED
    await this.supabase.admin
      .from('bargaining_offers')
      .update({ status: 'REJECTED' as OfferStatus })
      .eq('session_id', sessionId)
      .eq('status', 'PENDING');

    return {
      success: true,
      sessionId: updatedSession.id,
      status: 'REJECTED',
      reason: dto?.reason ?? 'Negotiation declined',
    };
  }

  /**
   * Cancel session
   */
  async cancelSession(sessionId: string, userId: string) {
    const session = await this.getSessionWithOffers(sessionId, userId, 'CONSUMER');

    if (session.status !== 'OPEN') {
      throw new BadRequestException(`Cannot cancel. Bargaining session is ${session.status.toLowerCase()}.`);
    }

    const { data: updatedSession, error } = await this.supabase.admin
      .from('bargaining_sessions')
      .update({
        status: 'CANCELLED' as BargainingStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, sessionId: updatedSession.id, status: 'CANCELLED' };
  }
}
