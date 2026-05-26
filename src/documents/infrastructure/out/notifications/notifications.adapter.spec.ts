/**
 * @file notifications.adapter.spec.ts
 * @module documents/infrastructure
 * @description Test unitario del adaptador de notificaciones. Verifica que
 * la selección de estrategia según el flag deferred es correcta.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsAdapter } from './notifications.adapter';
import { LogNotificationAdapter } from './log-notification.adapter';
import { WebSocketNotificationAdapter } from './websocket-notification.adapter';
import { NotificationPayload } from '../../../application/ports/out/notification.port';

const payload: NotificationPayload = {
  userId: 'user-1',
  title: 'Test',
  message: 'Mensaje',
  jobId: 'job-1',
  status: 'completed',
};

describe('NotificationsAdapter', () => {
  let adapter: NotificationsAdapter;

  const mockLogStrategy = { send: jest.fn().mockResolvedValue(undefined) };
  const mockWsStrategy = { send: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsAdapter,
        { provide: LogNotificationAdapter, useValue: mockLogStrategy },
        { provide: WebSocketNotificationAdapter, useValue: mockWsStrategy },
      ],
    }).compile();

    adapter = module.get(NotificationsAdapter);
  });

  it('debe usar LogNotificationAdapter cuando deferred=true', async () => {
    await adapter.send(payload, true);

    expect(mockLogStrategy.send).toHaveBeenCalledWith(payload);
    expect(mockWsStrategy.send).not.toHaveBeenCalled();
  });

  it('debe usar WebSocketNotificationAdapter cuando deferred=false', async () => {
    await adapter.send(payload, false);

    expect(mockWsStrategy.send).toHaveBeenCalledWith(payload);
    expect(mockLogStrategy.send).not.toHaveBeenCalled();
  });
});
