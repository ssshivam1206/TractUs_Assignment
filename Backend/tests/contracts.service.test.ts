import { describe, expect, it } from 'vitest';
import type { ContractStatus } from '../src/modules/contracts/contracts.rules.js';
import {
  ContractNotFoundError,
  ContractService,
  ContractWorkflowError,
  type ContractRepository,
  mapContractToApiObject,
} from '../src/modules/contracts/contracts.service.js';

type ContractRecord = {
  id: string;
  organisationId: string;
  clientName: string;
  poRefNo: string;
  poDate: Date;
  status: ContractStatus;
  fieldData: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt: Date | null;
  archivedAt: Date | null;
  deletedAt: Date | null;
};

const baseDate = new Date('2026-07-05T00:00:00.000Z');

function buildContract(overrides: Partial<ContractRecord> = {}): ContractRecord {
  return {
    id: 'contract-1',
    organisationId: 'org-1',
    clientName: 'Acme Trading',
    poRefNo: 'PO-1001',
    poDate: baseDate,
    status: 'DRAFT',
    fieldData: {
      client_name: 'Acme Trading',
      po_ref_no: 'PO-1001',
      po_date: '2026-07-05',
      items: [{ description: 'Steel coils', quantity: 10, unit_price: 1500 }],
    },
    createdAt: baseDate,
    updatedAt: baseDate,
    finalizedAt: null,
    archivedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

class InMemoryContractRepository implements ContractRepository {
  public readonly created: Array<{
    organisationId: string;
    clientName: string;
    poRefNo: string;
    poDate: Date;
    fieldData: Record<string, unknown>;
  }> = [];

  public readonly updates: Array<{
    contractId: string;
    changes: {
      clientName: string;
      poRefNo: string;
      poDate: Date;
      fieldData: Record<string, unknown>;
    };
  }> = [];

  public readonly deletions: Array<{ contractId: string; deletedAt: Date }> = [];

  constructor(private readonly items: ContractRecord[] = []) {}

  async create(contract: {
    organisationId: string;
    clientName: string;
    poRefNo: string;
    poDate: Date;
    fieldData: Record<string, unknown>;
  }) {
    this.created.push(contract);
    const created = buildContract({
      id: `contract-${this.items.length + 1}`,
      organisationId: contract.organisationId,
      clientName: contract.clientName,
      poRefNo: contract.poRefNo,
      poDate: contract.poDate,
      fieldData: contract.fieldData,
    });
    this.items.push(created);
    return created as never;
  }

  async findById(organisationId: string, contractId: string) {
    return (this.items.find(
      (contract) =>
        contract.id === contractId &&
        contract.organisationId === organisationId &&
        contract.deletedAt === null,
    ) ?? null) as never;
  }

  async listByOrganisation(organisationId: string) {
    return this.items
      .filter(
        (contract) => contract.organisationId === organisationId && contract.deletedAt === null,
      )
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()) as never;
  }

  async updateById(
    contractId: string,
    changes: {
      clientName: string;
      poRefNo: string;
      poDate: Date;
      fieldData: Record<string, unknown>;
    },
  ) {
    this.updates.push({ contractId, changes });
    const existing = this.items.find((contract) => contract.id === contractId);

    if (!existing) {
      throw new Error('Contract not found in test repository');
    }

    existing.clientName = changes.clientName;
    existing.poRefNo = changes.poRefNo;
    existing.poDate = changes.poDate;
    existing.fieldData = changes.fieldData;
    existing.updatedAt = new Date('2026-07-06T00:00:00.000Z');
    return existing as never;
  }

  async softDeleteById(contractId: string, deletedAt: Date) {
    this.deletions.push({ contractId, deletedAt });
    const existing = this.items.find((contract) => contract.id === contractId);

    if (!existing) {
      throw new Error('Contract not found in test repository');
    }

    existing.deletedAt = deletedAt;
    existing.updatedAt = deletedAt;
    return existing as never;
  }
}

describe('contract service', () => {
  it('creates contracts with the expected repository payload', async () => {
    const repository = new InMemoryContractRepository();
    const service = new ContractService(repository);

    const result = await service.createContract('org-1', {
      client_name: 'Acme Trading',
      po_ref_no: 'PO-1001',
      po_date: '2026-07-05',
      items: [{ description: 'Steel coils', quantity: 10, unit_price: 1500 }],
    });

    expect(repository.created[0]).toEqual({
      organisationId: 'org-1',
      clientName: 'Acme Trading',
      poRefNo: 'PO-1001',
      poDate: new Date('2026-07-05T00:00:00.000Z'),
      fieldData: {
        client_name: 'Acme Trading',
        po_ref_no: 'PO-1001',
        po_date: '2026-07-05',
        items: [{ description: 'Steel coils', quantity: 10, unit_price: 1500 }],
      },
    });

    expect(result).toMatchObject({
      id: 'contract-1',
      organisation_id: 'org-1',
      client_name: 'Acme Trading',
      po_ref_no: 'PO-1001',
      po_date: '2026-07-05',
      status: 'DRAFT',
      deleted_at: null,
    });
  });

  it('lists contracts in updated order', async () => {
    const repository = new InMemoryContractRepository([
      buildContract({ id: 'contract-1', updatedAt: new Date('2026-07-05T00:00:00.000Z') }),
      buildContract({
        id: 'contract-2',
        clientName: 'Beta Ltd',
        poRefNo: 'PO-1002',
        updatedAt: new Date('2026-07-06T00:00:00.000Z'),
        fieldData: {
          client_name: 'Beta Ltd',
          po_ref_no: 'PO-1002',
          po_date: '2026-07-06',
          items: [{ description: 'Copper rods', quantity: 4, unit_price: 2500 }],
        },
      }),
    ]);
    const service = new ContractService(repository);

    const result = await service.listContracts('org-1');

    expect(result.map((contract) => contract.id)).toEqual(['contract-2', 'contract-1']);
  });

  it('returns a contract by id', async () => {
    const repository = new InMemoryContractRepository([buildContract()]);
    const service = new ContractService(repository);

    await expect(service.getContract('org-1', 'contract-1')).resolves.toMatchObject({
      id: 'contract-1',
      organisation_id: 'org-1',
    });
  });

  it('throws when a contract is missing', async () => {
    const repository = new InMemoryContractRepository();
    const service = new ContractService(repository);

    await expect(service.getContract('org-1', 'missing')).rejects.toBeInstanceOf(
      ContractNotFoundError,
    );
  });

  it('updates only draft contracts', async () => {
    const repository = new InMemoryContractRepository([buildContract()]);
    const service = new ContractService(repository);

    const result = await service.updateContract('org-1', 'contract-1', {
      client_name: 'Acme Trading Pvt Ltd',
      po_ref_no: 'PO-2001',
      po_date: '2026-07-06',
      items: [{ description: 'Steel coils', quantity: 12, unit_price: 1600 }],
    });

    expect(repository.updates[0]).toEqual({
      contractId: 'contract-1',
      changes: {
        clientName: 'Acme Trading Pvt Ltd',
        poRefNo: 'PO-2001',
        poDate: new Date('2026-07-06T00:00:00.000Z'),
        fieldData: {
          client_name: 'Acme Trading Pvt Ltd',
          po_ref_no: 'PO-2001',
          po_date: '2026-07-06',
          items: [{ description: 'Steel coils', quantity: 12, unit_price: 1600 }],
        },
      },
    });

    expect(result).toMatchObject({
      client_name: 'Acme Trading Pvt Ltd',
      po_ref_no: 'PO-2001',
      po_date: '2026-07-06',
    });
  });

  it('rejects updates for non-draft contracts', async () => {
    const repository = new InMemoryContractRepository([
      buildContract({ status: 'FINALIZED' }),
    ]);
    const service = new ContractService(repository);

    await expect(
      service.updateContract('org-1', 'contract-1', {
        client_name: 'Acme Trading Pvt Ltd',
        po_ref_no: 'PO-2001',
        po_date: '2026-07-06',
        items: [{ description: 'Steel coils', quantity: 12, unit_price: 1600 }],
      }),
    ).rejects.toEqual(new ContractWorkflowError('Only draft contracts can be updated'));
  });

  it('soft deletes only draft contracts', async () => {
    const repository = new InMemoryContractRepository([buildContract()]);
    const service = new ContractService(repository);

    const result = await service.deleteContract('org-1', 'contract-1');

    expect(repository.deletions[0]?.contractId).toBe('contract-1');
    expect(result.deleted_at).toBeTruthy();
  });

  it('rejects deletes for non-draft contracts', async () => {
    const repository = new InMemoryContractRepository([
      buildContract({ status: 'FINALIZED' }),
    ]);
    const service = new ContractService(repository);

    await expect(service.deleteContract('org-1', 'contract-1')).rejects.toEqual(
      new ContractWorkflowError('Only draft contracts can be deleted'),
    );
  });

  it('maps contract records to api objects', () => {
    expect(mapContractToApiObject(buildContract())).toMatchObject({
      organisation_id: 'org-1',
      client_name: 'Acme Trading',
      po_ref_no: 'PO-1001',
      po_date: '2026-07-05',
      status: 'DRAFT',
    });
  });
});
