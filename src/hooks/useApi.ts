import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';
import {
  adminApi,
  announcementsApi,
  ApiError,
  celebrationsApi,
  charityApi,
  eventsApi,
  financeApi,
  governanceApi,
  ministriesApi,
  offeringsApi,
  prayerApi,
  projectsApi,
  reportsApi,
  rosterApi,
  servicesApi,
  settingsApi,
  tithesApi,
  usersApi,
  welfareApi,
  type AdminUserDto,
  type AnnouncementDto,
  type AppSettingDto,
  type AuditLogDto,
  type CelebrationDto,
  type CelebrationsMeta,
  type CharityActivityDto,
  type ContributionDto,
  type DocumentKind,
  type DutyDto,
  type EventDto,
  type FinanceAuditEntryDto,
  type FinanceAuditAction,
  type GovernanceDocumentDto,
  type ListEnvelope,
  type MeetingDto,
  type MeetingKind,
  type MeetingStatus,
  type MinistryDto,
  type MinistryMemberDto,
  type OfferingDto,
  type OrganizationProfileDto,
  type PageMeta,
  type PrayerRequestDto,
  type ProjectDto,
  type ReportOverviewDto,
  type ResolutionDto,
  type ResolutionStage,
  type RoleDto,
  type ServiceDto,
  type SettingKey,
  type SoftDeletedRecordDto,
  type SwapDto,
  type TitheDto,
  type WelfareCaseDto,
  type WelfareCategory,
  type WelfareStatus,
} from '../lib/api';

/** The one place an API failure becomes a sentence a screen can show. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.body.error;
  if (error instanceof TypeError) return 'Cannot reach the Praxis server. Check that the backend is running.';
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}

export interface Resource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Fetch once (and again when `deps` change), exposing loading and error as first-class state.
 *
 * The fetcher is held in a ref rather than a dependency: every caller passes a fresh arrow
 * closure each render, so depending on it directly would refetch forever. The identity that
 * actually matters is `deps`, which each hook passes as the primitive values it reads.
 */
export function useResource<T>(fetcher: () => Promise<T>, deps: unknown[] = []): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcherRef.current());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
    // The deps the caller supplied are the real dependency set; `refetch` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refetch, setData };
}

export interface ListResource<T> {
  items: T[];
  meta: PageMeta | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Local, optimistic replacement of the list between a write and the next refetch. */
  setItems: (update: T[] | ((prev: T[]) => T[])) => void;
}

/**
 * A list endpoint. The envelope is unwrapped here so a panel reads `items` and `meta` rather than
 * reaching through `data.data` at every render.
 */
function useList<T>(
  fetcher: () => Promise<ListEnvelope<T>>,
  deps: unknown[],
): ListResource<T> {
  const resource = useResource(fetcher, deps);
  const items = resource.data?.data ?? [];
  const meta = resource.data?.meta ?? null;

  const setItems = useCallback(
    (update: T[] | ((prev: T[]) => T[])) => {
      resource.setData((prev) => {
        const current = prev?.data ?? [];
        const next = typeof update === 'function' ? (update as (prev: T[]) => T[])(current) : update;
        return { data: next, meta: prev?.meta ?? { page: 1, pageSize: next.length, total: next.length, pages: 1 } };
      });
    },
    [resource],
  );

  return { items, meta, loading: resource.loading, error: resource.error, refetch: resource.refetch, setItems };
}

export interface Mutation<Args extends unknown[], R> {
  run: (...args: Args) => Promise<R>;
  pending: boolean;
  error: string | null;
}

/**
 * A write action with pending/error state. The function is held in a ref so the returned `run`
 * stays stable and can be used in a dependency array.
 */
export function useMutation<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>): Mutation<Args, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (...args: Args) => {
    setPending(true);
    setError(null);
    try {
      return await fnRef.current(...args);
    } catch (err) {
      setError(errorMessage(err));
      throw err;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, error };
}

// ==================== SERVICES & WORSHIP ====================
export function useServices(params?: { venue?: string; sort?: 'upcoming' | 'recent'; pageSize?: number }) {
  return useList<ServiceDto>(() => servicesApi.list(params), [params?.venue, params?.sort, params?.pageSize]);
}

export function useService(id: string | null) {
  return useResource(() => (id ? servicesApi.get(id) : Promise.resolve(null as never)), [id]);
}

export function useRoster(params?: { serviceId?: string; status?: DutyDto['status'] }) {
  return useList<DutyDto>(() => rosterApi.list(params), [params?.serviceId, params?.status]);
}

export function useSwaps(status?: SwapDto['status']) {
  const resource = useResource(() => rosterApi.listSwaps(status), [status]);
  return { ...resource, items: resource.data?.data ?? [] };
}

// ==================== FINANCES ====================
export function useTithes(params?: { q?: string; method?: TitheDto['method']; sort?: 'amount' | 'recent' | 'oldest' }) {
  const resource = useResource(() => tithesApi.list(params), [params?.q, params?.method, params?.sort]);
  return {
    items: resource.data?.data ?? [],
    total: resource.data?.totals.amount ?? 0,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    setItems: (update: TitheDto[] | ((prev: TitheDto[]) => TitheDto[])) =>
      resource.setData((prev) => {
        const current = prev?.data ?? [];
        const next = typeof update === 'function' ? update(current) : update;
        return { data: next, meta: prev?.meta ?? { page: 1, pageSize: next.length, total: next.length, pages: 1 }, totals: prev?.totals ?? { amount: 0 } };
      }),
  };
}

export function useOfferings(params?: { q?: string; method?: OfferingDto['method'] }) {
  const resource = useResource(() => offeringsApi.list(params), [params?.q, params?.method]);
  return {
    items: resource.data?.data ?? [],
    total: resource.data?.totals.amount ?? 0,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
  };
}

export function useProjects(params?: { status?: ProjectDto['status']; q?: string }) {
  return useList<ProjectDto>(() => projectsApi.list(params), [params?.status, params?.q]);
}

/** One project's gifts. The list is empty — not an error — while no project is selected. */
export function useProjectContributions(projectId: string | null) {
  return useList<ContributionDto>(
    () =>
      projectId
        ? projectsApi.contributions(projectId)
        : Promise.resolve({ data: [] as ContributionDto[], meta: { page: 1, pageSize: 0, total: 0, pages: 0 } }),
    [projectId],
  );
}

// ==================== COMMUNICATIONS ====================
export function useAnnouncements(params?: { audience?: string; live?: boolean }) {
  return useList<AnnouncementDto>(
    () => announcementsApi.list(params),
    [params?.audience, params?.live],
  );
}

export function useEvents(params?: { kind?: EventDto['kind']; upcoming?: boolean }) {
  return useList<EventDto>(() => eventsApi.list(params), [params?.kind, params?.upcoming]);
}

export function usePrayerRequests(params?: { status?: PrayerRequestDto['status'] }) {
  return useList<PrayerRequestDto>(() => prayerApi.list(params), [params?.status]);
}

export function useCelebrations(params?: { days?: number; kind?: 'all' | 'birthday' | 'anniversary' }) {
  const resource = useResource(() => celebrationsApi.list(params), [params?.days, params?.kind]);
  const meta: CelebrationsMeta | null = resource.data?.meta ?? null;
  return { items: resource.data?.data ?? [] as CelebrationDto[], meta, loading: resource.loading, error: resource.error, refetch: resource.refetch };
}

// ==================== FINANCES: WELFARE ====================
export function useWelfare(params?: { status?: WelfareStatus; category?: WelfareCategory; q?: string }) {
  const resource = useResource(() => welfareApi.list(params), [params?.status, params?.category, params?.q]);
  return {
    items: resource.data?.data ?? ([] as WelfareCaseDto[]),
    /** Money paid out, and money approved but not yet paid — the fund's two running totals. */
    totals: resource.data?.totals ?? { disbursed: 0, awaitingPayment: 0 },
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
  };
}

// ==================== FINANCES: CHARITY ====================
export function useCharity(params?: { initiative?: string; status?: CharityActivityDto['status']; q?: string }) {
  const resource = useResource(() => charityApi.list(params), [params?.initiative, params?.status, params?.q]);
  return {
    items: resource.data?.data ?? ([] as CharityActivityDto[]),
    totals: resource.data?.totals ?? { amount: 0, byInitiative: [] as Array<{ initiative: string; amount: number }> },
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
  };
}

// ==================== FINANCES: LEDGER & VOIDING ====================
export function useFinanceAudit(params?: { entityName?: string; action?: FinanceAuditAction }) {
  const resource = useResource(() => financeApi.listAudit(params), [params?.entityName, params?.action]);
  return {
    items: resource.data?.data ?? ([] as FinanceAuditEntryDto[]),
    totals: resource.data?.totals ?? { amount: null },
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
  };
}

/** Recomputes the chained ledger and reports where it first fails to add up. `admin` only, so it
 *  stays lazy: the finance panel asks for it when the treasurer opens the audit drawer, not on load. */
export function useLedgerVerification() {
  return useResource(() => financeApi.verifyLedger(), []);
}

// ==================== MINISTRIES ====================
export function useMinistries(params?: { q?: string; isActive?: boolean }) {
  return useList<MinistryDto>(() => ministriesApi.list(params), [params?.q, params?.isActive]);
}

/** Both Leadership Roles and Volunteer Roles: the same roll, read with and without `leadershipOnly`. */
export function useMinistryRoster(params?: { q?: string; ministryId?: string; leadershipOnly?: boolean }) {
  const resource = useResource(() => ministriesApi.roster(params), [params?.q, params?.ministryId, params?.leadershipOnly]);
  return {
    items: resource.data?.data ?? ([] as MinistryMemberDto[]),
    serving: resource.data?.totals.serving ?? 0,
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
  };
}

// ==================== GOVERNANCE ====================
export function useMeetings(params?: { q?: string; kind?: MeetingKind; status?: MeetingStatus }) {
  return useList<MeetingDto>(() => governanceApi.listMeetings(params), [params?.q, params?.kind, params?.status]);
}

export function useResolutions(params?: { q?: string; stage?: ResolutionStage }) {
  const resource = useResource(() => governanceApi.listResolutions(params), [params?.q, params?.stage]);
  return {
    items: resource.data?.data ?? ([] as ResolutionDto[]),
    /** How many sit at each stage — the tracker's own header counts. */
    counts: resource.data?.counts ?? ({} as Record<string, number>),
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
  };
}

export function useGovernanceDocuments(params?: { q?: string; kind?: DocumentKind; isActive?: boolean }) {
  const resource = useResource(() => governanceApi.listDocuments(params), [params?.q, params?.kind, params?.isActive]);
  return {
    items: resource.data?.data ?? ([] as GovernanceDocumentDto[]),
    counts: resource.data?.counts ?? ({} as Record<string, number>),
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
  };
}

// ==================== REPORTS ====================
/** The home screen's cards plus its activity feed, in one request. */
export function useReportOverview(params?: { from?: string; to?: string }) {
  return useResource(() => reportsApi.overview(params), [params?.from, params?.to]);
}

export function useMemberReport() {
  return useResource(() => reportsApi.members(), []);
}

export function useGivingReport(params?: { from?: string; to?: string }) {
  return useResource(() => reportsApi.giving(params), [params?.from, params?.to]);
}

export function useAttendanceReport(params?: { from?: string; to?: string }) {
  return useResource(() => reportsApi.attendance(params), [params?.from, params?.to]);
}

export function useMinistryReport() {
  return useResource(() => reportsApi.ministries(), []);
}

export function useGovernanceReport(params?: { from?: string; to?: string }) {
  return useResource(() => reportsApi.governance(params), [params?.from, params?.to]);
}

// ==================== SETTINGS ====================
export function useOrgProfile() {
  return useResource(() => settingsApi.getProfile(), []);
}

export function usePreferences() {
  return useResource(() => settingsApi.listPreferences(), []);
}

/** One preference screen's stored document. An unset key is a valid empty object, never an error. */
export function usePreference(key: SettingKey) {
  const resource = useResource(() => settingsApi.getPreference(key), [key]);
  const setting: AppSettingDto | null = resource.data?.data ?? null;
  return { setting, value: setting?.value ?? ({} as Record<string, unknown>), loading: resource.loading, error: resource.error, refetch: resource.refetch };
}

// ==================== ADMIN ====================
export function useTrash(params?: { entityName?: string; q?: string; includeRestored?: boolean }) {
  const resource = useResource(() => adminApi.listTrash(params), [params?.entityName, params?.q, params?.includeRestored]);
  return {
    items: resource.data?.data ?? ([] as SoftDeletedRecordDto[]),
    totals: resource.data?.totals ?? { awaitingRestore: 0, byEntity: {}, byReason: {} },
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
  };
}

export function useAuditLog(params?: { q?: string; action?: AuditLogDto['action']; entityName?: string }) {
  const resource = useResource(() => adminApi.listAudit(params), [params?.q, params?.action, params?.entityName]);
  return {
    items: resource.data?.data ?? ([] as AuditLogDto[]),
    totals: resource.data?.totals ?? { byAction: {}, byEntity: {} },
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
  };
}

export function useRoles() {
  const resource = useResource(() => adminApi.listRoles(), []);
  const roles: RoleDto[] = resource.data?.data ?? [];
  return { roles, loading: resource.loading, error: resource.error, refetch: resource.refetch };
}

export function useUsers(params?: { q?: string; roleKey?: string }) {
  return useList<AdminUserDto>(() => usersApi.list(params), [params?.q, params?.roleKey]);
}

// Re-exported so a panel can name the overview shape without importing from two modules.
export type { ReportOverviewDto, OrganizationProfileDto, WelfareCaseDto, MinistryMemberDto, ResolutionDto };
