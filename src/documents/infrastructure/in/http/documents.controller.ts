/**
 * @file documents.controller.ts
 * @module documents/infrastructure
 * @description Adaptador de entrada HTTP. Traduce peticiones REST a llamadas
 * a los casos de uso de aplicación y mapea las excepciones de dominio a
 * códigos de estado HTTP estándar.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { RegisterDocumentService } from '../../../application/services/register-document.service';
import { VerifyDocumentService } from '../../../application/services/verify-document.service';
import { RegisterDocumentDto } from './dto/register-document.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import {
  DuplicateDocumentException,
  InvalidDocumentHashException,
  SystemOverloadedException,
} from '../../../domain/exceptions/document.exceptions';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly registerUseCase: RegisterDocumentService,
    private readonly verifyUseCase: VerifyDocumentService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un documento en la blockchain' })
  @ApiResponse({ status: 201, description: 'Job encolado correctamente' })
  @ApiResponse({ status: 400, description: 'Formato de hash inválido' })
  @ApiResponse({ status: 409, description: 'Documento ya registrado' })
  @ApiResponse({ status: 503, description: 'Servicio saturado' })
  async registerDocument(@Body() dto: RegisterDocumentDto) {
    try {
      return await this.registerUseCase.execute(dto.hash);
    } catch (error) {
      if (error instanceof InvalidDocumentHashException) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof DuplicateDocumentException) {
        throw new ConflictException(error.message);
      }
      if (error instanceof SystemOverloadedException) {
        throw new ServiceUnavailableException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al procesar la solicitud de registro',
      );
    }
  }

  @Get('verify/:hash')
  @ApiOperation({ summary: 'Verificar si un documento está registrado' })
  @ApiParam({
    name: 'hash',
    description: 'Hash bytes32 del documento (0x + 64 hex)',
  })
  @ApiResponse({ status: 200, description: 'Resultado de la verificación' })
  @ApiResponse({ status: 400, description: 'Formato de hash inválido' })
  async verifyDocument(@Param() dto: VerifyDocumentDto) {
    try {
      return await this.verifyUseCase.execute(dto.hash);
    } catch (error) {
      if (error instanceof InvalidDocumentHashException) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException(
        'Error al consultar el contrato inteligente',
      );
    }
  }
}
