import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthController } from './health.controller';
import { SupabaseService } from '../supabase/supabase.service';

describe('HealthController', () => {
  let controller: HealthController;
  let supabaseService: SupabaseService;

  beforeEach(async () => {
    const mockSupabaseService = {
      checkHealth: jest.fn().mockResolvedValue(true),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return healthy status when database check succeeds', async () => {
    const result = await controller.checkHealth();
    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('healthy');
    expect(result.environment).toBe('test');
    expect(supabaseService.checkHealth).toHaveBeenCalled();
  });
});
