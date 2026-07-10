import { Prisma, type ContractEvent } from '../../../generated/prisma/client.js';
import { prisma } from '../../common/prisma.js';
import type {
  ContractAuditEventType,
  ContractApiObject,
  ContractEventApiObject,
  ContractRealtimeEvent,
  ContractRealtimeEventName,
} from './contracts.types.js';

export type ContractAuditEventInput = {
  contractId: string;
  organisationId: string;
  eventType: ContractAuditEventType;
  beforeState: ContractApiObject | null;
  afterState: ContractApiObject | null;
};

export interface ContractAuditRepository {
  recordEvent(input: ContractAuditEventInput): Promise<ContractEvent>;
  listByContract(organisationId: string, contractId: string): Promise<ContractEvent[]>;
}

export interface ContractRealtimeBroadcaster {
  publish(event: ContractRealtimeEvent): void;
}

const REALTIME_EVENT_NAMES: Record<ContractAuditEventType, ContractRealtimeEventName> = {
  CREATE: 'contract.created',
  UPDATE: 'contract.updated',
  FINALIZE: 'contract.finalized',
  ARCHIVE: 'contract.archived',
  DELETE: 'contract.deleted',
};

function toPrismaJsonSnapshot(snapshot: ContractApiObject | null) {
  if (!snapshot) {
    return Prisma.JsonNull;
  }

  return snapshot as Prisma.InputJsonValue;
}

export class PrismaContractAuditRepository implements ContractAuditRepository {
  async recordEvent(input: ContractAuditEventInput): Promise<ContractEvent> {
    return prisma.contractEvent.create({
      data: {
        contractId: input.contractId,
        organisationId: input.organisationId,
        eventType: input.eventType,
        beforeState: toPrismaJsonSnapshot(input.beforeState),
        afterState: toPrismaJsonSnapshot(input.afterState),
      },
    });
  }

  async listByContract(organisationId: string, contractId: string): Promise<ContractEvent[]> {
    return prisma.contractEvent.findMany({
      where: {
        organisationId,
        contractId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

export function mapContractEventToApiObject(event: ContractEvent): ContractEventApiObject {
  return {
    id: event.id,
    contract_id: event.contractId,
    organisation_id: event.organisationId,
    event_type: event.eventType as ContractAuditEventType,
    before_state: event.beforeState ? (event.beforeState as ContractApiObject) : null,
    after_state: event.afterState ? (event.afterState as ContractApiObject) : null,
    created_at: event.createdAt.toISOString(),
  };
}

export function buildContractRealtimeEvent(input: {
  eventType: ContractAuditEventType;
  beforeState: ContractApiObject | null;
  afterState: ContractApiObject | null;
}): ContractRealtimeEvent {
  const sourceState = input.afterState ?? input.beforeState;

  return {
    event_name: REALTIME_EVENT_NAMES[input.eventType],
    contract_id: sourceState?.id ?? input.beforeState?.id ?? input.afterState?.id ?? '',
    organisation_id:
      sourceState?.organisation_id ?? input.beforeState?.organisation_id ?? input.afterState?.organisation_id ?? '',
    old_status: input.beforeState?.status ?? null,
    new_status: input.afterState?.status ?? null,
    updated_at: input.afterState?.updated_at ?? input.beforeState?.updated_at ?? new Date().toISOString(),
    client_name: input.afterState?.client_name ?? input.beforeState?.client_name ?? '',
  };
}

