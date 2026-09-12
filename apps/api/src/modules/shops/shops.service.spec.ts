import { Test, TestingModule } from '@nestjs/testing';
import { ShopsService } from './shops.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ShopsService (Phase 3)', () => {
  let service: ShopsService;

  const mockSupabaseService = {
    admin: {
      from: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShopsService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<ShopsService>(ShopsService);
  });

  describe('createShop', () => {
    it('should create a new shop for seller', async () => {
      mockSupabaseService.admin.from.mockImplementation((table: string) => {
        if (table === 'shops') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: 'shop-1',
                    seller_id: 'seller-1',
                    name: 'Jaipur Handlooms',
                    slug: 'jaipur-handlooms-12345',
                    city: 'Jaipur',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await service.createShop('seller-1', {
        name: 'Jaipur Handlooms',
        addressLine1: 'Johari Bazar',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
        phone: '9876543210',
      });

      expect(result.id).toBe('shop-1');
      expect(result.name).toBe('Jaipur Handlooms');
    });

    it('should reject shop creation if seller already has a registered shop', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'existing-shop' } }),
          }),
        }),
      });

      await expect(
        service.createShop('seller-1', {
          name: 'Second Shop',
          addressLine1: 'Test Line',
          city: 'Jaipur',
          state: 'Rajasthan',
          pincode: '302001',
          phone: '9876543210',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateShop & seller ownership', () => {
    it('should throw ForbiddenException if user does not own the shop', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'shop-1', seller_id: 'original-seller' },
            }),
          }),
        }),
      });

      await expect(
        service.updateShop('hacker-user', 'shop-1', { name: 'Hacked Name' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if shop does not exist', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      await expect(
        service.updateShop('seller-1', 'non-existent-shop', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
