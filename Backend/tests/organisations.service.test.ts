import { describe, expect, it } from 'vitest';
import { OrganisationService, mapOrganisationToApiObject, type OrganisationRepository } from '../src/modules/organisations/organisations.service.js';

type OrganisationRecord = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

function buildOrganisation(overrides: Partial<OrganisationRecord> = {}): OrganisationRecord {
  return {
    id: 'org-1',
    name: 'Demo Org',
    createdAt: new Date('2026-07-05T00:00:00.000Z'),
    updatedAt: new Date('2026-07-05T00:00:00.000Z'),
    ...overrides,
  };
}

class InMemoryOrganisationRepository implements OrganisationRepository {
  constructor(private readonly items: OrganisationRecord[] = []) {}

  async create(input: { name: string }) {
    const created = buildOrganisation({
      id: `org-${this.items.length + 1}`,
      name: input.name,
    });

    this.items.push(created);
    return created as never;
  }

  async list() {
    return [...this.items] as never;
  }
}

describe('organisation service', () => {
  it('creates organisations', async () => {
    const repository = new InMemoryOrganisationRepository();
    const service = new OrganisationService(repository);

    const created = await service.createOrganisation({ name: 'Demo Org' });

    expect(created).toEqual({
      id: 'org-1',
      name: 'Demo Org',
      created_at: '2026-07-05T00:00:00.000Z',
      updated_at: '2026-07-05T00:00:00.000Z',
    });
  });

  it('lists organisations', async () => {
    const repository = new InMemoryOrganisationRepository([
      buildOrganisation(),
      buildOrganisation({ id: 'org-2', name: 'Northwind', updatedAt: new Date('2026-07-06T00:00:00.000Z') }),
    ]);
    const service = new OrganisationService(repository);

    const organisations = await service.listOrganisations();

    expect(organisations).toHaveLength(2);
    expect(organisations[0]?.name).toBe('Demo Org');
    expect(organisations[1]?.name).toBe('Northwind');
  });

  it('maps organisations to api objects', () => {
    expect(mapOrganisationToApiObject(buildOrganisation())).toEqual({
      id: 'org-1',
      name: 'Demo Org',
      created_at: '2026-07-05T00:00:00.000Z',
      updated_at: '2026-07-05T00:00:00.000Z',
    });
  });
});
