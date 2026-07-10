import 'dotenv/config';
import { Prisma, ContractEventType, ContractStatus } from '../generated/prisma/client.js';
import { prisma } from '../src/common/prisma.js';

type SeedOrganisationKey = 'orgA' | 'orgB';

type SeedLineItem = {
  description: string;
  quantity: number;
  quantity_unit: string;
  unit_price: number;
  pricing_unit: string;
  total: number;
};

type SeedContract = {
  id: string;
  organisationKey: SeedOrganisationKey;
  clientName: string;
  poRefNo: string;
  poDate: string;
  status: ContractStatus;
  paymentTerms: string;
  deliveryTerms: string;
  items: SeedLineItem[];
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  archivedAt?: string;
  auditEventIds: {
    create: string;
    finalize?: string;
    archive?: string;
  };
};

type ContractApiSnapshot = {
  id: string;
  organisation_id: string;
  client_name: string;
  po_ref_no: string;
  po_date: string;
  status: ContractStatus;
  field_data: {
    client_name: string;
    po_ref_no: string;
    po_date: string;
    payment_terms: string;
    delivery_terms: string;
    items: SeedLineItem[];
  };
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
};

const organisations = [
  {
    key: 'orgA',
    id: '9b3af1e7-0d4c-4e3e-9f3b-91a4b9d7c101',
    name: 'Demo Org A',
    createdAt: '2026-07-01T09:00:00.000Z',
  },
  {
    key: 'orgB',
    id: '4d8c6b21-6a8f-4f29-8e22-c92a6dc5e202',
    name: 'Demo Org B',
    createdAt: '2026-07-01T09:05:00.000Z',
  },
] as const;

const contracts: SeedContract[] = [
  {
    id: '7e4bb7c6-bf56-4ff4-a7f5-5c0a4c111301',
    organisationKey: 'orgA',
    clientName: 'Acme Trading Private',
    poRefNo: 'PO-1001',
    poDate: '2026-07-05',
    status: 'DRAFT',
    paymentTerms: 'Net 30',
    deliveryTerms: 'FOB Mumbai',
    items: [
      {
        description: 'Steel coils',
        quantity: 10,
        quantity_unit: 'tons',
        unit_price: 1500,
        pricing_unit: 'per ton',
        total: 15000,
      },
      {
        description: 'Packaging crates',
        quantity: 18,
        quantity_unit: 'units',
        unit_price: 45,
        pricing_unit: 'per unit',
        total: 810,
      },
    ],
    createdAt: '2026-07-05T08:30:00.000Z',
    updatedAt: '2026-07-05T08:30:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000101',
    },
  },
  {
    id: '63d5d939-94d8-4e0f-a93a-7c27bd221302',
    organisationKey: 'orgA',
    clientName: 'Zenith Metal Exports LLP',
    poRefNo: 'PO-2048',
    poDate: '2026-07-09',
    status: 'FINALIZED',
    paymentTerms: 'Net 15',
    deliveryTerms: 'CIF Chennai',
    items: [
      {
        description: 'Aluminium sheets',
        quantity: 12,
        quantity_unit: 'tons',
        unit_price: 980,
        pricing_unit: 'per ton',
        total: 11760,
      },
      {
        description: 'Industrial fasteners',
        quantity: 5000,
        quantity_unit: 'pieces',
        unit_price: 0.18,
        pricing_unit: 'per piece',
        total: 900,
      },
    ],
    createdAt: '2026-07-09T00:24:00.000Z',
    updatedAt: '2026-07-09T00:25:00.000Z',
    finalizedAt: '2026-07-09T00:25:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000102',
      finalize: 'f238b07b-6df5-4c6d-9f01-4a8c84000103',
    },
  },
  {
    id: 'f0c6f90a-13db-4b2b-bdcb-4fd2d3111304',
    organisationKey: 'orgA',
    clientName: 'Summit Alloy Works',
    poRefNo: 'PO-3188',
    poDate: '2026-07-10',
    status: 'DRAFT',
    paymentTerms: 'Net 25',
    deliveryTerms: 'Ex-Works Nashik',
    items: [
      {
        description: 'Nickel billets',
        quantity: 6,
        quantity_unit: 'lots',
        unit_price: 2100,
        pricing_unit: 'per lot',
        total: 12600,
      },
    ],
    createdAt: '2026-07-10T09:10:00.000Z',
    updatedAt: '2026-07-10T09:10:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000110',
    },
  },
  {
    id: 'be49d2b0-7ff0-4545-892e-b7a62d111305',
    organisationKey: 'orgA',
    clientName: 'Vertex Industrial Milling',
    poRefNo: 'PO-3255',
    poDate: '2026-07-06',
    status: 'ARCHIVED',
    paymentTerms: 'Net 10',
    deliveryTerms: 'Delivered Surat',
    items: [
      {
        description: 'Milled copper plates',
        quantity: 14,
        quantity_unit: 'sheets',
        unit_price: 430,
        pricing_unit: 'per sheet',
        total: 6020,
      },
    ],
    createdAt: '2026-07-06T08:15:00.000Z',
    updatedAt: '2026-07-07T13:20:00.000Z',
    finalizedAt: '2026-07-06T18:00:00.000Z',
    archivedAt: '2026-07-07T13:20:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000111',
      finalize: 'f238b07b-6df5-4c6d-9f01-4a8c84000112',
      archive: 'f238b07b-6df5-4c6d-9f01-4a8c84000113',
    },
  },
  {
    id: '0e95e2f6-5d68-4f9a-8b66-6cf5de111306',
    organisationKey: 'orgA',
    clientName: 'Crestline Metal Supply Co',
    poRefNo: 'PO-3301',
    poDate: '2026-07-11',
    status: 'FINALIZED',
    paymentTerms: 'Net 12',
    deliveryTerms: 'FOB Kandla',
    items: [
      {
        description: 'Zinc ingots',
        quantity: 9,
        quantity_unit: 'tons',
        unit_price: 870,
        pricing_unit: 'per ton',
        total: 7830,
      },
    ],
    createdAt: '2026-07-11T10:00:00.000Z',
    updatedAt: '2026-07-11T15:40:00.000Z',
    finalizedAt: '2026-07-11T15:40:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000114',
      finalize: 'f238b07b-6df5-4c6d-9f01-4a8c84000115',
    },
  },
  {
    id: '8cc0ff43-cb60-4fd4-b6f1-429ca1331303',
    organisationKey: 'orgB',
    clientName: 'Northwind Steels Ltd',
    poRefNo: 'PO-3100',
    poDate: '2026-07-03',
    status: 'ARCHIVED',
    paymentTerms: 'Net 21',
    deliveryTerms: 'Ex-Works Pune',
    items: [
      {
        description: 'Galvanised sheets',
        quantity: 8,
        quantity_unit: 'bundles',
        unit_price: 720,
        pricing_unit: 'per bundle',
        total: 5760,
      },
    ],
    createdAt: '2026-07-03T10:00:00.000Z',
    updatedAt: '2026-07-04T14:00:00.000Z',
    finalizedAt: '2026-07-03T18:30:00.000Z',
    archivedAt: '2026-07-04T14:00:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000104',
      finalize: 'f238b07b-6df5-4c6d-9f01-4a8c84000105',
      archive: 'f238b07b-6df5-4c6d-9f01-4a8c84000106',
    },
  },
  {
    id: '31cc7e31-a4a4-49f2-a0ce-5c15e2442301',
    organisationKey: 'orgB',
    clientName: 'Blue Ocean Commodities',
    poRefNo: 'PO-4105',
    poDate: '2026-07-07',
    status: 'DRAFT',
    paymentTerms: 'Net 45',
    deliveryTerms: 'Delivered Duty Paid Kochi',
    items: [
      {
        description: 'Copper rods',
        quantity: 4,
        quantity_unit: 'lots',
        unit_price: 2500,
        pricing_unit: 'per lot',
        total: 10000,
      },
    ],
    createdAt: '2026-07-07T11:15:00.000Z',
    updatedAt: '2026-07-07T11:15:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000107',
    },
  },
  {
    id: '55f1a56f-7931-4d05-a85a-f54ca2552302',
    organisationKey: 'orgB',
    clientName: 'Harbor Industrial Supplies',
    poRefNo: 'PO-5120',
    poDate: '2026-07-08',
    status: 'FINALIZED',
    paymentTerms: 'Net 20',
    deliveryTerms: 'FOB Mundra',
    items: [
      {
        description: 'Stainless bolts',
        quantity: 1200,
        quantity_unit: 'pcs',
        unit_price: 2.5,
        pricing_unit: 'per piece',
        total: 3000,
      },
      {
        description: 'Packaging material',
        quantity: 40,
        quantity_unit: 'rolls',
        unit_price: 28,
        pricing_unit: 'per roll',
        total: 1120,
      },
    ],
    createdAt: '2026-07-08T09:45:00.000Z',
    updatedAt: '2026-07-08T16:00:00.000Z',
    finalizedAt: '2026-07-08T16:00:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000108',
      finalize: 'f238b07b-6df5-4c6d-9f01-4a8c84000109',
    },
  },
  {
    id: '19b81031-0205-44d1-b5a9-4eb1f1222303',
    organisationKey: 'orgB',
    clientName: 'Atlas Marine Components',
    poRefNo: 'PO-5208',
    poDate: '2026-07-12',
    status: 'DRAFT',
    paymentTerms: 'Net 30',
    deliveryTerms: 'Delivered Vizag',
    items: [
      {
        description: 'Marine-grade valves',
        quantity: 24,
        quantity_unit: 'units',
        unit_price: 190,
        pricing_unit: 'per unit',
        total: 4560,
      },
    ],
    createdAt: '2026-07-12T09:20:00.000Z',
    updatedAt: '2026-07-12T09:20:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000116',
    },
  },
  {
    id: 'd84ecf3c-8f44-4dd7-8d0c-5ea3e9332304',
    organisationKey: 'orgB',
    clientName: 'Lighthouse Precision Parts',
    poRefNo: 'PO-5277',
    poDate: '2026-07-13',
    status: 'ARCHIVED',
    paymentTerms: 'Net 18',
    deliveryTerms: 'FOB Tuticorin',
    items: [
      {
        description: 'Precision cast housings',
        quantity: 16,
        quantity_unit: 'sets',
        unit_price: 260,
        pricing_unit: 'per set',
        total: 4160,
      },
    ],
    createdAt: '2026-07-13T08:50:00.000Z',
    updatedAt: '2026-07-14T12:05:00.000Z',
    finalizedAt: '2026-07-13T17:15:00.000Z',
    archivedAt: '2026-07-14T12:05:00.000Z',
    auditEventIds: {
      create: 'f238b07b-6df5-4c6d-9f01-4a8c84000117',
      finalize: 'f238b07b-6df5-4c6d-9f01-4a8c84000118',
      archive: 'f238b07b-6df5-4c6d-9f01-4a8c84000119',
    },
  },
];

const legacyOrganisationIds = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
] as const;

const legacyContractIds = [
  '11111111-aaaa-4111-8111-111111111111',
  '11111111-bbbb-4111-8111-222222222222',
  '11111111-cccc-4111-8111-333333333333',
  '22222222-aaaa-4222-8222-444444444444',
  '22222222-bbbb-4222-8222-555555555555',
  '6c491175-f0b4-4f79-a34c-c5ed6191cdf3',
  '8a9ebe98-0b84-41c0-9fe1-e8bb6874f9af',
  '0f73e136-fdee-41eb-bb85-d3d99d20d735',
] as const;

const legacyEventIds = [
  '70000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000003',
  '70000000-0000-4000-8000-000000000004',
  '70000000-0000-4000-8000-000000000005',
  '70000000-0000-4000-8000-000000000006',
  '70000000-0000-4000-8000-000000000007',
  '70000000-0000-4000-8000-000000000008',
  '70000000-0000-4000-8000-000000000009',
  'fa377f4b-6d97-459a-887a-12cc445abfd6',
  '68d5ac32-29c3-4513-9b89-053ee2c7785c',
  'e8288995-3812-44c9-b487-7826c094a9f3',
  'b68acd03-28b1-45fb-993e-5d0a81caaced',
] as const;

function buildFieldData(contract: SeedContract) {
  return {
    client_name: contract.clientName,
    po_ref_no: contract.poRefNo,
    po_date: contract.poDate,
    payment_terms: contract.paymentTerms,
    delivery_terms: contract.deliveryTerms,
    items: contract.items,
  };
}

function toNullableJson(snapshot: ContractApiSnapshot | null) {
  return snapshot ?? Prisma.JsonNull;
}

function buildSnapshot(
  contract: SeedContract,
  organisationId: string,
  overrides: {
    status?: ContractStatus;
    updatedAt?: string;
    finalizedAt?: string | null;
    archivedAt?: string | null;
  } = {},
): ContractApiSnapshot {
  const status = overrides.status ?? contract.status;
  const updatedAt = overrides.updatedAt ?? contract.updatedAt;
  const finalizedAt = overrides.finalizedAt === undefined ? contract.finalizedAt ?? null : overrides.finalizedAt;
  const archivedAt = overrides.archivedAt === undefined ? contract.archivedAt ?? null : overrides.archivedAt;

  return {
    id: contract.id,
    organisation_id: organisationId,
    client_name: contract.clientName,
    po_ref_no: contract.poRefNo,
    po_date: contract.poDate,
    status,
    field_data: buildFieldData(contract),
    created_at: contract.createdAt,
    updated_at: updatedAt,
    finalized_at: finalizedAt,
    archived_at: archivedAt,
    deleted_at: null,
  };
}

function buildAuditPlan(contract: SeedContract, organisationId: string) {
  const createState = buildSnapshot(contract, organisationId, {
    status: 'DRAFT',
    updatedAt: contract.createdAt,
    finalizedAt: null,
    archivedAt: null,
  });

  const events: Array<{
    id: string;
    eventType: ContractEventType;
    createdAt: string;
    beforeState: ContractApiSnapshot | null;
    afterState: ContractApiSnapshot | null;
  }> = [
    {
      id: contract.auditEventIds.create,
      eventType: 'CREATE',
      createdAt: contract.createdAt,
      beforeState: null,
      afterState: createState,
    },
  ];

  if ((contract.status === 'FINALIZED' || contract.status === 'ARCHIVED') && contract.auditEventIds.finalize) {
    const finalizedState = buildSnapshot(contract, organisationId, {
      status: 'FINALIZED',
      updatedAt: contract.finalizedAt ?? contract.updatedAt,
      finalizedAt: contract.finalizedAt ?? contract.updatedAt,
      archivedAt: null,
    });

    events.push({
      id: contract.auditEventIds.finalize,
      eventType: 'FINALIZE',
      createdAt: contract.finalizedAt ?? contract.updatedAt,
      beforeState: createState,
      afterState: finalizedState,
    });

    if (contract.status === 'ARCHIVED' && contract.auditEventIds.archive) {
      const archivedState = buildSnapshot(contract, organisationId, {
        status: 'ARCHIVED',
        updatedAt: contract.archivedAt ?? contract.updatedAt,
        finalizedAt: contract.finalizedAt ?? contract.updatedAt,
        archivedAt: contract.archivedAt ?? contract.updatedAt,
      });

      events.push({
        id: contract.auditEventIds.archive,
        eventType: 'ARCHIVE',
        createdAt: contract.archivedAt ?? contract.updatedAt,
        beforeState: finalizedState,
        afterState: archivedState,
      });
    }
  }

  return events;
}

async function ensureCanonicalOrganisations() {
  const organisationIdByKey = {} as Record<SeedOrganisationKey, string>;

  for (const organisation of organisations) {
    await prisma.organisation.upsert({
      where: { id: organisation.id },
      update: {
        name: organisation.name,
      },
      create: {
        id: organisation.id,
        name: organisation.name,
        createdAt: new Date(organisation.createdAt),
      },
    });

    const duplicateOrganisations = await prisma.organisation.findMany({
      where: {
        name: organisation.name,
        id: {
          not: organisation.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicateOrganisations.length > 0) {
      const duplicateIds = duplicateOrganisations.map((item) => item.id);

      await prisma.contract.updateMany({
        where: {
          organisationId: {
            in: duplicateIds,
          },
        },
        data: {
          organisationId: organisation.id,
        },
      });

      await prisma.contractEvent.updateMany({
        where: {
          organisationId: {
            in: duplicateIds,
          },
        },
        data: {
          organisationId: organisation.id,
        },
      });

      await prisma.organisation.deleteMany({
        where: {
          id: {
            in: duplicateIds,
          },
        },
      });
    }

    organisationIdByKey[organisation.key] = organisation.id;
  }

  return organisationIdByKey;
}

async function clearLegacySeedData() {
  await prisma.contractEvent.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: [...legacyEventIds],
          },
        },
        {
          contractId: {
            in: [...legacyContractIds],
          },
        },
      ],
    },
  });

  await prisma.contract.deleteMany({
    where: {
      id: {
        in: [...legacyContractIds],
      },
    },
  });

  await prisma.organisation.deleteMany({
    where: {
      id: {
        in: [...legacyOrganisationIds],
      },
    },
  });
}

async function reseedContractsAndEvents(organisationIdByKey: Record<SeedOrganisationKey, string>) {
  const contractIds = contracts.map((contract) => contract.id);
  const eventIds = contracts.flatMap((contract) =>
    [contract.auditEventIds.create, contract.auditEventIds.finalize, contract.auditEventIds.archive].filter(
      (value): value is string => Boolean(value),
    ),
  );

  await prisma.contractEvent.deleteMany({
    where: {
      OR: [
        {
          id: {
            in: eventIds,
          },
        },
        {
          contractId: {
            in: contractIds,
          },
        },
      ],
    },
  });

  await prisma.contract.deleteMany({
    where: {
      id: {
        in: contractIds,
      },
    },
  });

  for (const contract of contracts) {
    const organisationId = organisationIdByKey[contract.organisationKey];

    await prisma.contract.create({
      data: {
        id: contract.id,
        organisationId,
        clientName: contract.clientName,
        poRefNo: contract.poRefNo,
        poDate: new Date(`${contract.poDate}T00:00:00.000Z`),
        status: contract.status,
        fieldData: buildFieldData(contract),
        createdAt: new Date(contract.createdAt),
        updatedAt: new Date(contract.updatedAt),
        finalizedAt: contract.finalizedAt ? new Date(contract.finalizedAt) : null,
        archivedAt: contract.archivedAt ? new Date(contract.archivedAt) : null,
      },
    });

    for (const event of buildAuditPlan(contract, organisationId)) {
      await prisma.contractEvent.create({
        data: {
          id: event.id,
          contractId: contract.id,
          organisationId,
          eventType: event.eventType,
          beforeState: toNullableJson(event.beforeState),
          afterState: toNullableJson(event.afterState),
          createdAt: new Date(event.createdAt),
        },
      });
    }
  }
}

async function main() {
  const organisationIdByKey = await ensureCanonicalOrganisations();
  await clearLegacySeedData();
  await reseedContractsAndEvents(organisationIdByKey);

  console.log(`Seeded ${organisations.length} canonical organisations and ${contracts.length} seeded contracts.`);
}

main()
  .catch((error) => {
    console.error('Seeding failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
