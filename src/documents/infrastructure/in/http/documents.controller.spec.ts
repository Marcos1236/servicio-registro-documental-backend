/**
 * @file documents.controller.spec.ts
 * @module documents/infrastructure
 * @description Test unitario del adaptador HTTP. Valida la traducción entre
 * peticiones REST y la ejecución de casos de uso, incluyendo el mapeo de
 * excepciones de dominio a códigos de estado HTTP.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { RegisterDocumentService } from '../../../application/services/register-document.service';
import { VerifyDocumentService } from '../../../application/services/verify-document.service';
import {
  DuplicateDocumentException,
  InvalidDocumentHashException,
  SystemOverloadedException,
} from '../../../domain/exceptions/document.exceptions';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';

const VALID_HASH =
  '0xe8c6b5b48b78e66a103cd2c79aa19cd869a7e53fe31bba832f4592bf92e567c8';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  const mockRegisterService = { execute: jest.fn() };
  const mockVerifyService = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: RegisterDocumentService, useValue: mockRegisterService },
        { provide: VerifyDocumentService, useValue: mockVerifyService },
      ],
    }).compile();

    controller = module.get(DocumentsController);
  });

  describe('POST /register', () => {
    it('debe devolver el resultado del caso de uso en caso de éxito', async () => {
      const expected = {
        success: true,
        status: 'pending',
        hash: VALID_HASH,
        jobId: 'job-1',
      };
      mockRegisterService.execute.mockResolvedValue(expected);

      const result = await controller.registerDocument({ hash: VALID_HASH });

      expect(result).toEqual(expected);
      expect(mockRegisterService.execute).toHaveBeenCalledWith(VALID_HASH);
    });

    it('debe convertir InvalidDocumentHashException en BadRequestException (400)', async () => {
      mockRegisterService.execute.mockRejectedValue(
        new InvalidDocumentHashException('bad'),
      );

      await expect(
        controller.registerDocument({ hash: 'bad' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe convertir DuplicateDocumentException en ConflictException (409)', async () => {
      mockRegisterService.execute.mockRejectedValue(
        new DuplicateDocumentException(VALID_HASH),
      );

      await expect(
        controller.registerDocument({ hash: VALID_HASH }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe convertir SystemOverloadedException en ServiceUnavailableException (503)', async () => {
      mockRegisterService.execute.mockRejectedValue(
        new SystemOverloadedException('Saturado'),
      );

      await expect(
        controller.registerDocument({ hash: VALID_HASH }),
      ).rejects.toThrow(ServiceUnavailableException);
    });

    it('debe convertir cualquier otro error en InternalServerErrorException (500)', async () => {
      mockRegisterService.execute.mockRejectedValue(
        new Error('Error inesperado'),
      );

      await expect(
        controller.registerDocument({ hash: VALID_HASH }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('GET /verify/:hash', () => {
    it('debe devolver el resultado del caso de uso en caso de éxito', async () => {
      const expected = {
        success: true,
        isVerified: true,
        hash: VALID_HASH,
        timestamp: '14/11/2023',
        issuer: '0xAbC123',
      };
      mockVerifyService.execute.mockResolvedValue(expected);

      const result = await controller.verifyDocument({ hash: VALID_HASH });

      expect(result).toEqual(expected);
    });

    it('debe convertir InvalidDocumentHashException en BadRequestException (400)', async () => {
      mockVerifyService.execute.mockRejectedValue(
        new InvalidDocumentHashException('bad'),
      );

      await expect(controller.verifyDocument({ hash: 'bad' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe convertir cualquier otro error en InternalServerErrorException (500)', async () => {
      mockVerifyService.execute.mockRejectedValue(new Error('Error de red'));

      await expect(
        controller.verifyDocument({ hash: VALID_HASH }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
