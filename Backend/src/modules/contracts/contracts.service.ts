import type { Contract, Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../common/prisma.js';
import { isDraftContractStatus } from './contracts.rules.js';
import type { ContractApiObject } from './contracts.types.js';
import type { ContractFieldData } from './contracts.validation.js';

export class ContractNotFoundError extends Error {
  constructor(message = 'Contract not found') {
    super(message);
    this.name = 'ContractNotFoundError';
  }
}

export class ContractWorkflowError extends Error {
  constructor(message = 'Invalid contract workflow') {
    super(message);
    this.name = 'ContractWorkflowError';
  }
}

export interface ContractRepository {
  create(contract: {
    organisationId: string;
    clientName: string;
    poRefNo: string;
    poDate: Date;
    fieldData: ContractFieldData;
  }): Promise<Contract>;
  findById(organisationId: string, contractId: string): Promise<Contract | null>;
  listByOrganisation(organisationId: string): Promise<Contract[]>;
  updateById(
    contractId: string,
    changes: {
      clientName: string;
      poRefNo: string;
      poDate: Date;
      fieldData: ContractFieldData;
    },
  ): Promise<Contract>;
  softDeleteById(contractId: string, deletedAt: Date): Promise<Contract>;
}

export class PrismaContractRepository implements ContractRepository {
  async create(contract: {
    organisationId: string;
    clientName: string;
    poRefNo: string;
    poDate: Date;
    fieldData: ContractFieldData;
  }): Promise<Contract> {
    return prisma.contract.create({
      data: {
        organisationId: contract.organisationId,
        clientName: contract.clientName,
        poRefNo: contract.poRefNo,
        poDate: contract.poDate,
        fieldData: contract.fieldData as Prisma.InputJsonValue,
      },
    });
  }

  async findById(organisationId: string, contractId: string): Promise<Contract | null> {
    return prisma.contract.findFirst({
      where: {
        id: contractId,
        organisationId,
        deletedAt: null,
      },
    });
  }

  async listByOrganisation(organisationId: string): Promise<Contract[]> {
    return prisma.contract.findMany({
      where: {
        organisationId,
        deletedAt: null,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async updateById(
    contractId: string,
    changes: {
      clientName: string;
      poRefNo: string;
      poDate: Date;
      fieldData: ContractFieldData;
    },
  ): Promise<Contract> {
    return prisma.contract.update({
      where: {
        id: contractId,
      },
      data: {
        clientName: changes.clientName,
        poRefNo: changes.poRefNo,
        poDate: changes.poDate,
        fieldData: changes.fieldData as Prisma.InputJsonValue,
      },
    });
  }

  async softDeleteById(contractId: string, deletedAt: Date): Promise<Contract> {
    return prisma.contract.update({
      where: {
        id: contractId,
      },
      data: {
        deletedAt,
      },
    });
  }
}

export class ContractService {
  constructor(private readonly repository: ContractRepository) {}

  async createContract(organisationId: string, payload: ContractFieldData): Promise<ContractApiObject> {
    const created = await this.repository.create({
      organisationId,
      clientName: payload.client_name,
      poRefNo: payload.po_ref_no,
      poDate: new Date(`${payload.po_date}T00:00:00.000Z`),
      fieldData: payload,
    });

    return mapContractToApiObject(created);
  }

  async listContracts(organisationId: string): Promise<ContractApiObject[]> {
    const contracts = await this.repository.listByOrganisation(organisationId);
    return contracts.map(mapContractToApiObject);
  }

  async getContract(organisationId: string, contractId: string): Promise<ContractApiObject> {
    const contract = await this.repository.findById(organisationId, contractId);

    if (!contract) {
      throw new ContractNotFoundError();
    }

    return mapContractToApiObject(contract);
  }

  async updateContract(
    organisationId: string,
    contractId: string,
    payload: ContractFieldData,
  ): Promise<ContractApiObject> {
    const existing = await this.repository.findById(organisationId, contractId);

    if (!existing) {
      throw new ContractNotFoundError();
    }

    if (!isDraftContractStatus(existing.status)) {
      throw new ContractWorkflowError('Only draft contracts can be updated');
    }

    const updated = await this.repository.updateById(contractId, {
      clientName: payload.client_name,
      poRefNo: payload.po_ref_no,
      poDate: new Date(`${payload.po_date}T00:00:00.000Z`),
      fieldData: payload,
    });

    return mapContractToApiObject(updated);
  }

  async deleteContract(organisationId: string, contractId: string): Promise<ContractApiObject> {
    const existing = await this.repository.findById(organisationId, contractId);

    if (!existing) {
      throw new ContractNotFoundError();
    }

    if (!isDraftContractStatus(existing.status)) {
      throw new ContractWorkflowError('Only draft contracts can be deleted');
    }

    const deleted = await this.repository.softDeleteById(contractId, new Date());
    return mapContractToApiObject(deleted);
  }
}

export function mapContractToApiObject(contract: Contract): ContractApiObject {
  return {
    id: contract.id,
    organisation_id: contract.organisationId,
    client_name: contract.clientName,
    po_ref_no: contract.poRefNo,
    po_date: contract.poDate.toISOString().slice(0, 10),
    status: contract.status,
    field_data: contract.fieldData as ContractFieldData,
    created_at: contract.createdAt.toISOString(),
    updated_at: contract.updatedAt.toISOString(),
    finalized_at: contract.finalizedAt ? contract.finalizedAt.toISOString() : null,
    archived_at: contract.archivedAt ? contract.archivedAt.toISOString() : null,
    deleted_at: contract.deletedAt ? contract.deletedAt.toISOString() : null,
  };
}
