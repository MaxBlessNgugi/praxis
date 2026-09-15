import { useState, useCallback, useEffect } from 'react';
import { api, ApiError, type ItemEnvelope, type MemberReportDto } from '../api';

export interface ReportOverviewResponse {
  period: { from: string | null; to: string | null };
  cards: {
    activeMembers: number;
    membersTotal: number;
    households: number;
    activeMinistries: number;
    giving: number;
    tithes: number;
    offerings: number;
    projectCash: number;
    welfareDisbursed: number;
    charitySpend: number;
    pendingResolutions: number;
    upcomingMeetings: number;
  };
  nextEvents: Array<{
    id: string;
    title: string;
    description: string | null;
    kind: string;
    venue: string;
    startsAt: string;
    endsAt: string;
    isRecurring: boolean;
  }>;
  lastService: {
    id: string;
    title: string;
    heldAt: string;
    venue: string;
    theme: string | null;
  } | null;
  recentActivity: Array<{
    id: string;
    actor: {
      id: string;
      name: string;
    };
    action: string;
    entityName: string;
    entityId: string;
    summary: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    ipAddress: string | null;
    createdAt: string;
  }>;
}

export interface ReportRange {
  from?: string;
  to?: string;
}

export function useOverviewReport() {
  const [data, setData] = useState<ReportOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async (range?: ReportRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (range?.from) params.set('from', range.from);
      if (range?.to) params.set('to', range.to);
      const query = params.toString() ? `?${params.toString()}` : '';
      // The API wraps every single item as `{ data }`; storing the envelope here is what made the
      // dashboard read `cards` off the wrapper and throw before it could draw a single card.
      const response = await api.get<ItemEnvelope<ReportOverviewResponse>>(`/api/reports/overview${query}`);
      setData(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.error : 'Failed to load overview');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return { data, isLoading, error, refetch: fetchOverview };
}

/**
 * The register's own counts, for the census cards above the Members screens.
 *
 * Those cards report the whole roll, so they cannot read the page of rows underneath them: that list
 * is filtered by the search box and paged, and a filtered page is not a census.
 */
export function useMemberReport() {
  const [data, setData] = useState<MemberReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<ItemEnvelope<MemberReportDto>>('/api/reports/members');
      setData(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.body.error : 'Failed to load the register report');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, isLoading, error, refetch };
}