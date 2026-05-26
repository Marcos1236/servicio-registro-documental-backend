/**
 * @file notifications.adapter.ts
 * @module documents/infrastructure
 * @description Adaptador de salida que implementa INotificationPort aplicando
 * el patrón Strategy para enrutar cada notificación al canal correcto sin
 * que los consumidores necesiten conocer los detalles de ningún canal concreto.
 *
 * Selección de estrategia:
 * - deferred=true  → LogNotificationAdapter    (canal asíncrono / diferido).
 * - deferred=false → WebSocketNotificationAdapter (canal en tiempo real).
 *
 * Para añadir un nuevo canal (email, push, SMS) basta con implementar
 * NotificationStrategy y registrarlo en DocumentsModule, sin tocar
 * este adaptador ni DocumentsProcessor.
 */

import { Injectable } from '@nestjs/common';
import {
  INotificationPort,
  NotificationPayload,
} from '../../../application/ports/out/notification.port';
import { NotificationStrategy } from './notification-strategy.interface';
import { LogNotificationAdapter } from './log-notification.adapter';
import { WebSocketNotificationAdapter } from './websocket-notification.adapter';

@Injectable()
export class NotificationsAdapter implements INotificationPort {
  constructor(
    private readonly logStrategy: LogNotificationAdapter,
    private readonly wsStrategy: WebSocketNotificationAdapter,
  ) {}

  /**
   * Selecciona la estrategia adecuada según el modo del job y delega el envío.
   *
   * @param payload  - Datos completos de la notificación.
   * @param deferred - true para canal diferido (log), false para tiempo real (WebSocket).
   */
  async send(payload: NotificationPayload, deferred: boolean): Promise<void> {
    const strategy: NotificationStrategy = deferred
      ? this.logStrategy
      : this.wsStrategy;

    await strategy.send(payload);
  }
}
