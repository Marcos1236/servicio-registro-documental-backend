/**
 * @file log-notification.adapter.spec.ts
 * @module documents/infrastructure
 * @description Test unitario de la estrategia de notificación por consola.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LogNotificationAdapter } from './log-notification.adapter';

describe('LogNotificationAdapter', () => {
  let adapter: LogNotificationAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogNotificationAdapter],
    }).compile();

    adapter = module.get(LogNotificationAdapter);
  });

  it('debe tener name = "LOG_MOCK"', () => {
    expect(adapter.name).toBe('LOG_MOCK');
  });

  it('debe resolver la promesa sin lanzar errores', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await expect(
      adapter.send({
        userId: 'user-1',
        title: 'Test',
        message: 'Mensaje de prueba',
        status: 'completed',
      }),
    ).resolves.toBeUndefined();

    consoleSpy.mockRestore();
  });

  it('debe imprimir el userId y el título en consola', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await adapter.send({
      userId: 'user-42',
      title: 'Registro Completado',
      message: 'Detalle del mensaje',
    });

    const output = consoleSpy.mock.calls.flat().join(' ');
    expect(output).toContain('user-42');
    expect(output).toContain('Registro Completado');

    consoleSpy.mockRestore();
  });
});
