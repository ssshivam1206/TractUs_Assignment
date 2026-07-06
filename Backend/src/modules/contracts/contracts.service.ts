import type { Contract, Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../common/prisma.js';
import {
  canTransitionContractStatus,
  isDraftContractStatus,
  isFinalizedContractStatus,
  type ContractStatus,
} from './contracts.rules.js';
import type {
  ContractApiObject,
  ContractListFilters,
  ContractListResponse,
  ContractUpdateInput,
} from './contracts.types.js';
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

export type ContractListRepositoryResult = {
  items: Contract[];
  total: number;
};

export type ContractUpdateChanges = {
  clientName?: string;
  poRefNo?: string;
  poDate?: Date;
  fieldData?: ContractFieldData;
  status?: ContractStatus;
  finalizedAt?: Date | null;
  archivedAt?: Date | null;
};

export interface ContractRepository {
  create(contract: {
    organisationId: string;
    clientName: string;
    poRefNo: string;
    poDate: Date;
    fieldData: ContractFieldData;
  }): Promise<Contract>;
  findById(organisationId: string, contractId: string): Promise<Contract | null>;
  listByOrganisation(
    organisationId: string,
    filters: ContractListFilters,
  ): Promise<ContractListRepositoryResult>;
  updateById(contractId: string, changes: ContractUpdateChanges): Promise<Contract>;
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

  async listByOrganisation(
    organisationId: string,
    filters: ContractListFilters,
  ): Promise<ContractListRepositoryResult> {
    const where = buildContractListWhereClause(organisationId, filters);

    const [items, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        orderBy: {
          updatedAt: 'desc',
        },
        skip: filters.offset,
        take: filters.limit,
      }),
      prisma.contract.count({ where }),
    ]);

    return { items, total };
  }

  async updateById(contractId: string, changes: ContractUpdateChanges): Promise<Contract> {
    const data: Prisma.ContractUpdateInput = {};

    if (changes.clientName !== undefined) {
      data.clientName = changes.clientName;
    }

    if (changes.poRefNo !== undefined) {
      data.poRefNo = changes.poRefNo;
    }

    if (changes.poDate !== undefined) {
      data.poDate = changes.poDate;
    }

    if (changes.fieldData !== undefined) {
      data.fieldData = changes.fieldData as Prisma.InputJsonValue;
    }

    if (changes.status !== undefined) {
      data.status = changes.status;
    }

    if (changes.finalizedAt !== undefined) {
      data.finalizedAt = changes.finalizedAt;
    }

    if (changes.archivedAt !== undefined) {
      data.archivedAt = changes.archivedAt;
    }

    return prisma.contract.update({
      where: {
        id: contractId,
      },
      data,
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

  async createContract(
    organisationId: string,
    payload: ContractFieldData,
  ): Promise<ContractApiObject> {
    const created = await this.repository.create({
      organisationId,
      clientName: payload.client_name,
      poRefNo: payload.po_ref_no,
      poDate: new Date(`${payload.po_date}T00:00:00.000Z`),
      fieldData: payload,
    });

    return mapContractToApiObject(created);
  }

  async listContracts(
    organisationId: string,
    filters: ContractListFilters,
  ): Promise<ContractListResponse> {
    const result = await this.repository.listByOrganisation(organisationId, filters);

    return {
      items: result.items.map(mapContractToApiObject),
      page: filters.page,
      limit: filters.limit,
      total: result.total,
      total_pages: result.total === 0 ? 0 : Math.ceil(result.total / filters.limit),
    };
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
    payload: ContractUpdateInput,
  ): Promise<ContractApiObject> {
    const existing = await this.repository.findById(organisationId, contractId);

    if (!existing) {
      throw new ContractNotFoundError();
    }

    if (!isDraftContractStatus(existing.status)) {
      throw new ContractWorkflowError('Only draft contracts can be updated');
    }

    const nextFieldData = mergeContractFieldData(existing.fieldData as ContractFieldData, payload);
    const updated = await this.repository.updateById(contractId, {
      clientName: nextFieldData.client_name,
      poRefNo: nextFieldData.po_ref_no,
      poDate: new Date(`${nextFieldData.po_date}T00:00:00.000Z`),
      fieldData: nextFieldData,
    });

    return mapContractToApiObject(updated);
  }

  async finalizeContract(organisationId: string, contractId: string): Promise<ContractApiObject> {
    const existing = await this.repository.findById(organisationId, contractId);

    if (!existing) {
      throw new ContractNotFoundError();
    }

    if (!canTransitionContractStatus(existing.status, 'FINALIZED')) {
      throw new ContractWorkflowError('Only draft contracts can be finalized');
    }

    const finalizedAt = new Date();
    const updated = await this.repository.updateById(contractId, {
      status: 'FINALIZED',
      finalizedAt,
    });

    return mapContractToApiObject(updated);
  }

  async archiveContract(organisationId: string, contractId: string): Promise<ContractApiObject> {
    const existing = await this.repository.findById(organisationId, contractId);

    if (!existing) {
      throw new ContractNotFoundError();
    }

    if (!isFinalizedContractStatus(existing.status)) {
      throw new ContractWorkflowError('Only finalized contracts can be archived');
    }

    const archivedAt = new Date();
    const updated = await this.repository.updateById(contractId, {
      status: 'ARCHIVED',
      archivedAt,
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

function mergeContractFieldData(
  existingFieldData: ContractFieldData,
  patch: ContractUpdateInput,
): ContractFieldData {
  return {
    ...existingFieldData,
    ...patch,
  };
}

function buildContractListWhereClause(
  organisationId: string,
  filters: ContractListFilters,
): Prisma.ContractWhereInput {
  return {
    organisationId,
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.clientName
      ? {
          clientName: {
            contains: filters.clientName,
            mode: 'insensitive',
          },
        }
      : {}),
    ...(filters.contractId ? { id: filters.contractId } : {}),
  };
}
