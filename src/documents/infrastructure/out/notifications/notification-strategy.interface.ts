/**
 * @file notification-strategy.interface.ts
 * @module documents/infrastructure
 * @description Contrato interno del patrón Strategy para las estrategias
 * concretas de notificación. Solo es visible dentro de la capa de
 * infraestructura; la capa de aplicación únicamente conoce INotificationPort.
 *
 * Campos del payload:
 * - userId   : destinatario.
 * - title    : asunto o título del mensaje.
 * - message  : cuerpo en texto plano.
 * Campos opcionales para estrategias estructuradas (WebSocket):
 * - jobId    : identificador del job.
 * - txHash   : hash de la transacción (éxito).
 * - error    : mensaje de error (fallo).
 * - status   : 'completed' | 'failed'.
 */

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  jobId?: string;
  txHash?: string;
  error?: string;
  status?: 'completed' | 'failed';
}

export interface NotificationStrategy {
  /** Nombre identificativo del canal. Usado para logs y selección dinámica. */
  readonly name: string;

  /**
   * Envía la notificación al canal concreto que implementa la estrategia.
   * @param payload - Datos de la notificación.
   */
  send(payload: NotificationPayload): Promise<void>;
}
