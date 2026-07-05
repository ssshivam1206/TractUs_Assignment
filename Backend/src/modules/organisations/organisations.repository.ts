import type { Organisation } from '../../../generated/prisma/client.js';
import { prisma } from '../../common/prisma.js';
import type { OrganisationCreateInput } from './organisations.types.js';
import type { OrganisationRepository } from './organisations.service.js';

export class PrismaOrganisationRepository implements OrganisationRepository {
  async create(input: OrganisationCreateInput): Promise<Organisation> {
    return prisma.organisation.create({
      data: {
        name: input.name,
      },
    });
  }

  async list(): Promise<Organisation[]> {
    return prisma.organisation.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
