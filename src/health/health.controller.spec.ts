import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  HttpHealthIndicator,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockHttpHealthIndicator = {
    pingCheck: jest.fn(),
  };

  const mockMicroserviceHealthIndicator = {
    pingCheck: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: unknown) => {
      if (key === 'REDIS_HOST') return 'localhost';
      if (key === 'REDIS_PORT') return 6379;
      if (key === 'VAULT_ENDPOINT') return 'http://localhost:8200';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: HttpHealthIndicator, useValue: mockHttpHealthIndicator },
        {
          provide: MicroserviceHealthIndicator,
          useValue: mockMicroserviceHealthIndicator,
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('llama a health.check con dos indicadores', async () => {
    mockHealthCheckService.check.mockResolvedValue({ status: 'ok' });
    mockMicroserviceHealthIndicator.pingCheck.mockResolvedValue({
      redis: { status: 'up' },
    });
    mockHttpHealthIndicator.pingCheck.mockResolvedValue({
      vault: { status: 'up' },
    });

    await controller.check();

    expect(mockHealthCheckService.check).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(Function), expect.any(Function)]),
    );
  });

  it('el indicador Redis usa Transport.REDIS con host y puerto de ConfigService', async () => {
    mockHealthCheckService.check.mockImplementation(
      async (fns: (() => Promise<unknown>)[]) => {
        for (const fn of fns) await fn();
        return { status: 'ok' };
      },
    );
    mockMicroserviceHealthIndicator.pingCheck.mockResolvedValue({});
    mockHttpHealthIndicator.pingCheck.mockResolvedValue({});

    await controller.check();

    expect(mockMicroserviceHealthIndicator.pingCheck).toHaveBeenCalledWith(
      'redis',
      {
        transport: Transport.REDIS,
        options: { host: 'localhost', port: 6379 },
      },
    );
  });

  it('el indicador Vault hace ping al endpoint /v1/sys/health', async () => {
    mockHealthCheckService.check.mockImplementation(
      async (fns: (() => Promise<unknown>)[]) => {
        for (const fn of fns) await fn();
        return { status: 'ok' };
      },
    );
    mockMicroserviceHealthIndicator.pingCheck.mockResolvedValue({});
    mockHttpHealthIndicator.pingCheck.mockResolvedValue({});

    await controller.check();

    expect(mockHttpHealthIndicator.pingCheck).toHaveBeenCalledWith(
      'vault',
      'http://localhost:8200/v1/sys/health',
    );
  });

  it('devuelve el resultado de health.check', async () => {
    const expected = { status: 'ok', details: { redis: { status: 'up' } } };
    mockHealthCheckService.check.mockResolvedValue(expected);

    const result = await controller.check();

    expect(result).toBe(expected);
  });

  it('propaga errores cuando algún indicador falla', async () => {
    mockHealthCheckService.check.mockRejectedValue(
      new Error('Health check failed'),
    );

    await expect(controller.check()).rejects.toThrow('Health check failed');
  });
});
