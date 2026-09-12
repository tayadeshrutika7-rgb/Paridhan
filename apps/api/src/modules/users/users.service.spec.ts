import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('UsersService (Phase 2)', () => {
  let service: UsersService;

  const mockSupabaseService = {
    admin: {
      from: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getProfile', () => {
    it('should return user profile if found', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'usr-1', full_name: 'Priya Sharma', role: 'CONSUMER' },
              error: null,
            }),
          }),
        }),
      });

      const profile = await service.getProfile('usr-1');
      expect(profile.id).toBe('usr-1');
      expect(profile.full_name).toBe('Priya Sharma');
    });

    it('should throw NotFoundException if profile does not exist', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAddress ownership and permissions', () => {
    it('should allow user to update their own address', async () => {
      const mockSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { id: 'addr-1', user_id: 'usr-1' },
            error: null,
          }),
        }),
      });

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'addr-1', user_id: 'usr-1', label: 'Work Office' },
              error: null,
            }),
          }),
        }),
      });

      mockSupabaseService.admin.from.mockImplementation(() => {
        return {
          select: mockSelect,
          update: mockUpdate,
        };
      });

      const updated = await service.updateAddress('usr-1', 'addr-1', { label: 'Work Office' });
      expect(updated.label).toBe('Work Office');
    });

    it('should throw ForbiddenException if user attempts to modify an address belonging to another user', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'addr-other', user_id: 'usr-someone-else' },
              error: null,
            }),
          }),
        }),
      });

      await expect(
        service.updateAddress('usr-1', 'addr-other', { label: 'Hacked Label' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user attempts to delete an address belonging to another user', async () => {
      mockSupabaseService.admin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'addr-other', user_id: 'usr-someone-else' },
              error: null,
            }),
          }),
        }),
      });

      await expect(service.deleteAddress('usr-1', 'addr-other')).rejects.toThrow(ForbiddenException);
    });
  });
});
