/**
 * @file documents.processor.spec.ts
 * @module documents/infrastructure
 * @description Test unitario del adaptador de mensajería BullMQ. Verifica que
 * el procesador coordina correctamente el registro en blockchain y la
 * notificación del resultado a través de los puertos de salida, sin acoplarse
 * a ninguna implementación concreta de infraestructura.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsProcessor, RegisterJobData } from './documents.processor';
import {
  I_BLOCKCHAIN_PORT,
  IBlockchainPort,
} from '../../../application/ports/out/blockchain.port';
import {
  I_NOTIFICATION_PORT,
  INotificationPort,
} from '../../../application/ports/out/notification.port';
import { Job } from 'bullmq';

describe('DocumentsProcessor', () => {
  let processor: DocumentsProcessor;

  const mockBlockchainPort = {
    registrarHash: jest.fn<
      ReturnType<IBlockchainPort['registrarHash']>,
      Parameters<IBlockchainPort['registrarHash']>
    >(),
    verificarHash: jest.fn<
      ReturnType<IBlockchainPort['verificarHash']>,
      Parameters<IBlockchainPort['verificarHash']>
    >(),
  };

  const mockNotificationPort = {
    send: jest.fn<
      ReturnType<INotificationPort['send']>,
      Parameters<INotificationPort['send']>
    >(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsProcessor,
        { provide: I_BLOCKCHAIN_PORT, useValue: mockBlockchainPort },
        { provide: I_NOTIFICATION_PORT, useValue: mockNotificationPort },
      ],
    }).compile();

    processor = module.get(DocumentsProcessor);
  });

  const createMockJob = (
    hash: string,
    deferred: boolean,
  ): Job<RegisterJobData, unknown, string> =>
    ({
      name: 'register-document',
      id: 'job-123',
      data: { hash, deferred, userId: 'user-1' },
    }) as unknown as Job<RegisterJobData, unknown, string>;

  describe('enrutamiento de jobs', () => {
    it('debe lanzar error si el nombre del job no está soportado', async () => {
      const job = {
        name: 'unknown-job',
        id: 'job-999',
      } as unknown as Job<RegisterJobData, unknown, string>;

      await expect(processor.process(job)).rejects.toThrow(
        'Job name no soportado: unknown-job',
      );
    });
  });

  describe('job NORMAL (deferred=false)', () => {
    it('debe registrar en blockchain y notificar éxito por WebSocket', async () => {
      mockBlockchainPort.registrarHash.mockResolvedValue('0xTxExito');
      const job = createMockJob('0xHash', false);

      const result = await processor.process(job);

      expect(result).toEqual({ txHash: '0xTxExito' });
      expect(mockNotificationPort.send).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          jobId: 'job-123',
          txHash: '0xTxExito',
          status: 'completed',
        }),
        false,
      );
    });
  });

  describe('job DIFERIDO (deferred=true)', () => {
    it('debe registrar en blockchain y notificar por canal diferido', async () => {
      mockBlockchainPort.registrarHash.mockResolvedValue('0xTxExito');
      const job = createMockJob('0xHash', true);

      const result = await processor.process(job);

      expect(result).toEqual({ txHash: '0xTxExito' });
      expect(mockNotificationPort.send).toHaveBeenCalledWith(
        expect.any(Object),
        true,
      );
    });
  });

  describe('gestión de errores', () => {
    it('debe notificar fallo y relanzar el error si falla la blockchain', async () => {
      mockBlockchainPort.registrarHash.mockRejectedValue(
        new Error('Fallo simulado'),
      );
      const job = createMockJob('0xHash', false);

      await expect(processor.process(job)).rejects.toThrow('Fallo simulado');

      expect(mockNotificationPort.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'Error en la red blockchain',
        }),
        false,
      );
    });

    it('debe resolver sin relanzar si el error es DUPLICATE_HASH', async () => {
      mockBlockchainPort.registrarHash.mockRejectedValue(
        new Error('DUPLICATE_HASH'),
      );
      const job = createMockJob('0xHash', false);

      await expect(processor.process(job)).resolves.toEqual({
        error: 'El documento ya fue registrado previamente',
      });

      expect(mockNotificationPort.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'El documento ya fue registrado previamente',
        }),
        false,
      );
    });

    it('debe traducir error no-Error como "Error en la red blockchain"', async () => {
      mockBlockchainPort.registrarHash.mockRejectedValue('string-error');
      const job = createMockJob('0xHash', false);

      await expect(processor.process(job)).rejects.toBe('string-error');

      expect(mockNotificationPort.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'Error en la red blockchain',
        }),
        false,
      );
    });
  });
});
