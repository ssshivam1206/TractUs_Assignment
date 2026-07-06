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
import { getOrganisations } from '@/lib/api';
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
};

const OrganisationContext = createContext<OrganisationContextValue | null>(null);

function readPersistedOrganisationId() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ORGANISATION_STORAGE_KEY);
}

export function OrganisationProvider({ children }: { children: ReactNode }) {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [activeOrganisationId, setActiveOrganisationIdState] = useState<string | null>(readPersistedOrganisationId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to load organisations');
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
    };
  }, [activeOrganisation, activeOrganisationId, error, isLoading, organisations, refreshOrganisations]);

  return <OrganisationContext.Provider value={value}>{children}</OrganisationContext.Provider>;
}

export function useOrganisation() {
  const context = useContext(OrganisationContext);
  if (!context) {
    throw new Error('useOrganisation must be used inside OrganisationProvider');
  }

  return context;
}
