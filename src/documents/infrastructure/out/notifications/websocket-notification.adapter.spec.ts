/**
 * @file websocket-notification.adapter.spec.ts
 * @module documents/infrastructure
 * @description Test unitario del adaptador WebSocket. Verifica la gestión
 * de suscripciones a salas y el envío de eventos de estado de jobs.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketNotificationAdapter } from './websocket-notification.adapter';
import { Server, Socket } from 'socket.io';

describe('WebSocketNotificationAdapter', () => {
  let adapter: WebSocketNotificationAdapter;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  const mockSocket = {
    id: 'socket-abc',
    join: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [WebSocketNotificationAdapter],
    }).compile();

    adapter = module.get(WebSocketNotificationAdapter);
    adapter.server = mockServer as unknown as Server;
  });

  it('debe tener name = "WEBSOCKET"', () => {
    expect(adapter.name).toBe('WEBSOCKET');
  });

  describe('handleJoinJob', () => {
    it('debe suscribir al cliente a la sala job-{jobId}', async () => {
      await adapter.handleJoinJob(mockSocket as unknown as Socket, {
        jobId: 'job-42',
      });

      expect(mockSocket.join).toHaveBeenCalledWith('job-job-42');
    });
  });

  describe('send', () => {
    it('debe emitir job-status completed con txHash', async () => {
      await adapter.send({
        userId: 'user-1',
        title: 'OK',
        message: 'msg',
        jobId: 'job-1',
        status: 'completed',
        txHash: '0xTxHash',
      });

      expect(mockServer.to).toHaveBeenCalledWith('job-job-1');
      expect(mockServer.emit).toHaveBeenCalledWith('job-status', {
        status: 'completed',
        txHash: '0xTxHash',
      });
    });

    it('debe emitir job-status failed con error', async () => {
      await adapter.send({
        userId: 'user-1',
        title: 'Fallo',
        message: 'msg',
        jobId: 'job-1',
        status: 'failed',
        error: 'Error de red',
      });

      expect(mockServer.to).toHaveBeenCalledWith('job-job-1');
      expect(mockServer.emit).toHaveBeenCalledWith('job-status', {
        status: 'failed',
        error: 'Error de red',
      });
    });

    it('debe hacer warn y resolver sin emitir si falta jobId o status', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(
        adapter.send({ userId: 'u', title: 't', message: 'm' }),
      ).resolves.toBeUndefined();

      expect(mockServer.emit).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('debe resolver sin emitir si completed pero sin txHash', async () => {
      await adapter.send({
        userId: 'u',
        title: 't',
        message: 'm',
        jobId: 'job-1',
        status: 'completed',
      });

      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });
});
