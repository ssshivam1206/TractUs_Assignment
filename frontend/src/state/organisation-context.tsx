'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getApiBaseUrl, getOrganisations } from '@/lib/api';
import type { ContractRealtimeEvent } from '@/types/contract';
import type { Organisation } from '@/types/organisation';

const ORGANISATION_STORAGE_KEY = 'tractus.activeOrganisationId';

type OrganisationContextValue = {
  organisations: Organisation[];
  activeOrganisationId: string | null;
  activeOrganisation: Organisation | null;
  isLoading: boolean;
  error: string | null;
  setActiveOrganisationId: (organisationId: string) => void;
  refreshOrganisations: () => Promise<void>;
  latestContractEvent: ContractRealtimeEvent | null;
  realtimeVersion: number;
};

const OrganisationContext = createContext<OrganisationContextValue | null>(null);

function readPersistedOrganisationId() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ORGANISATION_STORAGE_KEY);
}

function isContractRealtimeEventName(value: string): value is ContractRealtimeEvent['event_name'] {
  return (
    value === 'contract.created' ||
    value === 'contract.updated' ||
    value === 'contract.finalized' ||
    value === 'contract.archived' ||
    value === 'contract.deleted'
  );
}

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [activeOrganisationId, setActiveOrganisationIdState] = useState<string | null>(readPersistedOrganisationId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestContractEvent, setLatestContractEvent] = useState<ContractRealtimeEvent | null>(null);
  const [realtimeVersion, setRealtimeVersion] = useState(0);

  const refreshOrganisations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextOrganisations = await getOrganisations();
      setOrganisations(nextOrganisations);

      setActiveOrganisationIdState((current) => {
        if (!current) {
          return null;
        }

        if (!nextOrganisations.some((organisation) => organisation.id === current)) {
          return null;
        }

        return current;
      });
    } catch (refreshError) {
      setError(refreshError instanceof Error ? 'We could not load organisations. Make sure the backend is running and try again.' : 'Failed to load organisations');
      setOrganisations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshOrganisations();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshOrganisations]);

  useEffect(() => {
    if (!activeOrganisationId) {
      window.localStorage.removeItem(ORGANISATION_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(ORGANISATION_STORAGE_KEY, activeOrganisationId);
  }, [activeOrganisationId]);

  useEffect(() => {
    if (!activeOrganisationId || typeof window.EventSource === 'undefined') {
      const timer = window.setTimeout(() => setLatestContractEvent(null), 0);
      return () => window.clearTimeout(timer);
    }

    const streamUrl = new URL('/events/contracts', getApiBaseUrl());
    streamUrl.searchParams.set('organisation_id', activeOrganisationId);
    const source = new window.EventSource(streamUrl.toString());

    const handleRealtimeEvent = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as ContractRealtimeEvent;
        if (!isContractRealtimeEventName(parsed.event_name)) {
          return;
        }

        setLatestContractEvent(parsed);
        setRealtimeVersion((current) => current + 1);
      } catch {
        // Ignore malformed events and keep the stream alive.
      }
    };

    const eventNames: ContractRealtimeEvent['event_name'][] = [
      'contract.created',
      'contract.updated',
      'contract.finalized',
      'contract.archived',
      'contract.deleted',
    ];

    eventNames.forEach((eventName) => {
      source.addEventListener(eventName, handleRealtimeEvent as EventListener);
    });

    source.onerror = () => {
      // Browser EventSource will reconnect automatically.
    };

    return () => {
      eventNames.forEach((eventName) => {
        source.removeEventListener(eventName, handleRealtimeEvent as EventListener);
      });
      source.close();
    };
  }, [activeOrganisationId]);

  const activeOrganisation = useMemo(
    () => organisations.find((organisation) => organisation.id === activeOrganisationId) ?? null,
    [activeOrganisationId, organisations],
  );

  const value = useMemo<OrganisationContextValue>(() => {
    return {
      organisations,
      activeOrganisationId,
      activeOrganisation,
      isLoading,
      error,
      setActiveOrganisationId: (organisationId: string) => {
        setActiveOrganisationIdState(organisationId);
      },
      refreshOrganisations,
      latestContractEvent,
      realtimeVersion,
    };
  }, [
    activeOrganisation,
    activeOrganisationId,
    error,
    isLoading,
    latestContractEvent,
    organisations,
    realtimeVersion,
    refreshOrganisations,
  ]);

  return <OrganisationContext.Provider value={value}>{children}</OrganisationContext.Provider>;
}

export function useOrganisation() {
  const context = useContext(OrganisationContext);
  if (!context) {
    throw new Error('useOrganisation must be used inside OrganisationProvider');
  }

  return context;
}

