/**
 * @file health.module.ts
 * @module health
 * @description Módulo de observabilidad. Registra los indicadores de salud de
 *   Terminus y expone el HealthController en la ruta /health (fuera del prefijo
 *   global api/v1, para que los orquestadores como Docker o Kubernetes puedan
 *   consultarlo sin autenticación ni prefijo de versión).
 *
 * Dependencias externas:
 *   - @nestjs/terminus  Librería de health checks de NestJS.
 *   - @nestjs/axios     Cliente HTTP usado por HttpHealthIndicator para el
 *                       ping al Secret Manager.
 */

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
