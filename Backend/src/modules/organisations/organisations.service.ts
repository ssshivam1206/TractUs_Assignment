import type { Organisation } from '../../../generated/prisma/client.js';
import type { OrganisationApiObject, OrganisationCreateInput } from './organisations.types.js';

export interface OrganisationRepository {
  create(input: OrganisationCreateInput): Promise<Organisation>;
  list(): Promise<Organisation[]>;
}

export class OrganisationService {
  constructor(private readonly repository: OrganisationRepository) {}

  async createOrganisation(input: OrganisationCreateInput): Promise<OrganisationApiObject> {
    const created = await this.repository.create(input);
    return mapOrganisationToApiObject(created);
  }

  async listOrganisations(): Promise<OrganisationApiObject[]> {
    const organisations = await this.repository.list();
    return organisations.map(mapOrganisationToApiObject);
  }
}

export function mapOrganisationToApiObject(organisation: Organisation): OrganisationApiObject {
  return {
    id: organisation.id,
    name: organisation.name,
    created_at: organisation.createdAt.toISOString(),
    updated_at: organisation.updatedAt.toISOString(),
  };
}
