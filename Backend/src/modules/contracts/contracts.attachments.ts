import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Contract, ContractAttachment } from '../../../generated/prisma/client.js';
import { prisma } from '../../common/prisma.js';
import { ContractNotFoundError, PrismaContractRepository, type ContractRepository } from './contracts.service.js';
import type { ContractAttachmentApiObject } from './contracts.types.js';

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const PDF_MIME_TYPE = 'application/pdf';

export type ContractAttachmentUpload = {
  originalName: string;
  mimeType: string;
  fileSize: number;
  buffer: Buffer;
};

export class ContractAttachmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractAttachmentValidationError';
  }
}

export interface ContractAttachmentRepository {
  create(input: {
    contractId: string;
    organisationId: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
  }): Promise<ContractAttachment>;
  listByContract(
    organisationId: string,
    contractId: string,
  ): Promise<ContractAttachment[]>;
}

export class PrismaContractAttachmentRepository implements ContractAttachmentRepository {
  async create(input: {
    contractId: string;
    organisationId: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
  }): Promise<ContractAttachment> {
    return prisma.contractAttachment.create({
      data: input,
    });
  }

  async listByContract(
    organisationId: string,
    contractId: string,
  ): Promise<ContractAttachment[]> {
    return prisma.contractAttachment.findMany({
      where: {
        organisationId,
        contractId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export class ContractAttachmentService {
  constructor(
    private readonly contractRepository: Pick<ContractRepository, 'findByIdIncludingDeleted'> = new PrismaContractRepository(),
    private readonly attachmentRepository: ContractAttachmentRepository = new PrismaContractAttachmentRepository(),
    private readonly uploadsDirectory = resolveUploadsDirectory(),
  ) {}

  async listContractAttachments(
    organisationId: string,
    contractId: string,
  ): Promise<ContractAttachmentApiObject[]> {
    await this.assertContractExists(organisationId, contractId);
    const attachments = await this.attachmentRepository.listByContract(
      organisationId,
      contractId,
    );

    return attachments.map(mapContractAttachmentToApiObject);
  }

  async createContractAttachment(
    organisationId: string,
    contractId: string,
    upload: ContractAttachmentUpload,
  ): Promise<ContractAttachmentApiObject> {
    await this.assertContractExists(organisationId, contractId);
    validateAttachmentUpload(upload);

    const storagePath = await persistAttachmentFile(
      this.uploadsDirectory,
      contractId,
      upload,
    );

    const attachment = await this.attachmentRepository.create({
      contractId,
      organisationId,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      fileSize: upload.fileSize,
      storagePath,
    });

    return mapContractAttachmentToApiObject(attachment);
  }

  private async assertContractExists(
    organisationId: string,
    contractId: string,
  ): Promise<Contract> {
    const contract = await this.contractRepository.findByIdIncludingDeleted(
      organisationId,
      contractId,
    );

    if (!contract) {
      throw new ContractNotFoundError();
    }

    return contract;
  }
}

function validateAttachmentUpload(upload: ContractAttachmentUpload) {
  if (!upload.originalName.trim()) {
    throw new ContractAttachmentValidationError('Attachment name is required');
  }

  if (upload.mimeType !== PDF_MIME_TYPE) {
    throw new ContractAttachmentValidationError('Only PDF files are allowed');
  }

  if (upload.fileSize <= 0) {
    throw new ContractAttachmentValidationError('Attachment file is empty');
  }

  if (upload.fileSize > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new ContractAttachmentValidationError('PDF must be 10 MB or smaller');
  }
}

async function persistAttachmentFile(
  uploadsDirectory: string,
  contractId: string,
  upload: ContractAttachmentUpload,
): Promise<string> {
  const contractDirectory = path.join(uploadsDirectory, contractId);
  await mkdir(contractDirectory, { recursive: true });

  const fileName = `${randomUUID()}.pdf`;
  const absoluteFilePath = path.join(contractDirectory, fileName);
  await writeFile(absoluteFilePath, upload.buffer);

  return path.relative(process.cwd(), absoluteFilePath).replaceAll('\\', '/');
}

function resolveUploadsDirectory() {
  return path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');
}

export function mapContractAttachmentToApiObject(
  attachment: ContractAttachment,
): ContractAttachmentApiObject {
  return {
    id: attachment.id,
    contract_id: attachment.contractId,
    organisation_id: attachment.organisationId,
    original_name: attachment.originalName,
    mime_type: attachment.mimeType,
    file_size: attachment.fileSize,
    storage_path: attachment.storagePath,
    created_at: attachment.createdAt.toISOString(),
  };
}

export { MAX_ATTACHMENT_SIZE_BYTES, PDF_MIME_TYPE };
