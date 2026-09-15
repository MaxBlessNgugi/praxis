const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

/**
 * The access token is held in memory for the life of the tab and mirrored into web storage so a
 * reload can restore the session. `api.ts` owns the storage keys so there is exactly one writer — a
 * second `localStorage.removeItem` in the auth layer is how a cleared token comes back.
 *
 * Two storages, because the gate offers the choice and the choice matters in a church office.
 * **Remember Me** keeps the session in `localStorage`, which survives closing the browser; without
 * it the token goes to `sessionStorage`, which the browser drops when the window does. On a shared
 * office machine the second is the one to leave behind, and until this was wired the checkbox
 * changed nothing while looking like it did.
 *
 * A token only ever lives in one of them: every write clears the other, so a remembered token cannot
 * outlive a later sign-in that was not remembered.
 */
const TOKEN_STORAGE_KEY = 'praxis_auth_token';

let token: string | null = null;

/** The persisted token, read once at boot before any request is made. */
export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

/** `remember` chooses the storage; `null` always clears both. */
export function setAuthToken(newToken: string | null, remember = true): void {
  token = newToken;
  if (newToken) {
    const store = remember ? localStorage : sessionStorage;
    const stale = remember ? sessionStorage : localStorage;
    store.setItem(TOKEN_STORAGE_KEY, newToken);
    stale.removeItem(TOKEN_STORAGE_KEY);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function clearToken(): void {
  setAuthToken(null);
}

/**
 * A 401 means the session is over. The auth layer registers this so it can clear the user and let
 * the gate re-render; calling a callback (rather than reloading the page) keeps a wrong-password 401
 * on the sign-in screen, where its error belongs, instead of bouncing the visitor off it.
 */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

export function getAuthHeader(): string | undefined {
  return token ? `Bearer ${token}` : undefined;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  fields?: Array<{ path: string; message: string }>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorResponse,
  ) {
    super(body.error ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (response.status === 401) {
    clearToken();
    onUnauthorized?.();
    throw new ApiError(401, { error: 'Unauthorized', code: 'unauthorized' });
  }

  if (!response.ok) {
    const body: ApiErrorResponse = isJson
      ? await response.json()
      : { error: response.statusText };
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  // Anything that is not JSON is handed back as bytes. That covers a PDF certificate and a PNG logo
  // with one rule, rather than a list of MIME types that a new upload format would quietly fall
  // outside of — and it is why an image now arrives as a Blob instead of `undefined`.
  if (!isJson) {
    return response.blob() as Promise<T>;
  }

  return response.json() as Promise<T>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestInit,
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const authHeader = getAuthHeader();
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });

  return handleResponse<T>(response);
}

export const api = {
  get<T>(path: string, options?: RequestInit): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>('POST', path, body);
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>('PATCH', path, body);
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>('PUT', path, body);
  },

  delete<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },
};

/** Query-string builder that drops empty values, so `?venue=` never reaches the API. */
function qs(params?: Record<string, string | number | boolean | undefined | null>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : '';
}

// ==================== AUTH ====================
/**
 * The account exactly as the API sends it. Two details matter and both were wrong before:
 * the token field is `token` (not `accessToken`), and `rights` arrives *beside* the user rather
 * than on it. A bare `roleKey: string` is deliberate — the wire carries a string, so narrowing it
 * to the console's role union is `auth.tsx`'s job, and typing it as the union here would be a lie.
 */
export interface AuthUserDto {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  memberId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Panel + action rights resolved from the account's role. The full panel map, or the permitted subset. */
export interface AuthRights {
  panels: Record<string, boolean>;
  actions: Record<string, boolean>;
}

export interface LoginResponse {
  data: {
    token: string;
    expiresIn: string;
    user: AuthUserDto;
    rights: AuthRights;
  };
}

export interface MeResponse {
  data: {
    user: AuthUserDto;
    rights: AuthRights;
  };
}

// ==================== SHARED ENVELOPES ====================
/**
 * The backend writes every response through `respond.ts`: a single item is `{ data }`, a list is
 * `{ data, meta }`, a failure is `{ error }`. These types make that shape explicit at the call site
 * instead of leaving each caller to guess.
 */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface ListEnvelope<T> {
  data: T[];
  meta: PageMeta;
}

export interface ItemEnvelope<T> {
  data: T;
}

/** A member as other records refer to them (never the whole register row). */
export interface MemberRef {
  id: string;
  firstName: string;
  lastName: string;
  initials: string | null;
}

export interface MemberRefWithPhone extends MemberRef {
  phone: string | null;
}

// ==================== SERVICES & WORSHIP ====================
export type LiturgyKind =
  | 'call_to_worship'
  | 'praise_worship'
  | 'prayer'
  | 'scripture'
  | 'sermon'
  | 'offering'
  | 'announcements'
  | 'presentation'
  | 'dismissal'
  | 'other';

export interface LiturgyItemDto {
  id: string;
  serviceId: string;
  position: number;
  title: string;
  kind: LiturgyKind;
  durationMinutes: number | null;
  responsible: string | null;
  ministryId: string | null;
  notes: string | null;
}

export interface ServiceDto {
  id: string;
  title: string;
  heldAt: string;
  startTime: string | null;
  venue: string;
  theme: string | null;
  officiantId: string | null;
  notes: string | null;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  officiant?: MemberRef | null;
  liturgy?: LiturgyItemDto[];
  _count?: { liturgy: number; attendance: number; roster: number };
}

export interface CreateServiceBody {
  title: string;
  heldAt: string;
  startTime?: string;
  venue: string;
  theme?: string;
  officiantId?: string;
  notes?: string;
  isTemplate?: boolean;
}

export interface LiturgyItemInput {
  title: string;
  kind: LiturgyKind;
  durationMinutes?: number;
  responsible?: string;
  ministryId?: string;
  notes?: string;
}

export type AttendanceKind = 'service' | 'group' | 'meeting';

export interface AttendanceDto {
  id: string;
  serviceId: string | null;
  memberId: string | null;
  kind: AttendanceKind;
  count: number;
  visitorName: string | null;
  notes: string | null;
  recordedAt: string;
  member?: MemberRef | null;
}

export interface AttendanceRowInput {
  kind?: AttendanceKind;
  count?: number;
  memberId?: string;
  visitorName?: string;
  notes?: string;
  recordedAt?: string;
}

export interface AttendanceSummaryDto {
  serviceId: string;
  attendanceRows: number;
  totalCounted: number;
  namedMembers: number;
  namedVisitors: number;
  byKind: Record<string, number>;
}

export type DutyStatus = 'scheduled' | 'confirmed' | 'completed' | 'missed' | 'replaced' | 'cancelled';

export interface DutyDto {
  id: string;
  serviceId: string;
  memberId: string;
  roleTitle: string;
  ministryId: string | null;
  status: DutyStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  service?: { id: string; title: string; heldAt: string; venue: string };
  holder?: MemberRefWithPhone;
}

export interface SwapDto {
  id: string;
  dutyId: string;
  requestedById: string;
  replacementId: string | null;
  status: 'requested' | 'approved' | 'declined' | 'cancelled';
  reason: string | null;
  decidedById: string | null;
  decidedAt: string | null;
  createdAt: string;
  duty?: { id: string; serviceId: string; roleTitle: string; service?: { id: string; title: string; heldAt: string } };
  requestedBy?: MemberRef;
  replacement?: MemberRef | null;
}

export interface ServiceReportDto {
  id: string;
  serviceId: string;
  summary: string;
  adultsCount: number | null;
  childrenCount: number | null;
  visitorsCount: number | null;
  offeringsTotal: number | null;
  highlights: string | null;
  preparedById: string | null;
  preparedBy?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertServiceReportBody {
  summary: string;
  adultsCount?: number;
  childrenCount?: number;
  visitorsCount?: number;
  offeringsTotal?: number;
  highlights?: string;
}

export interface RetireBody {
  reason: string;
  reasonLabel: string;
}

export const servicesApi = {
  list: (params?: { venue?: string; isTemplate?: boolean; from?: string; to?: string; page?: number; pageSize?: number; sort?: 'upcoming' | 'recent' }) =>
    api.get<ListEnvelope<ServiceDto>>(`/api/services${qs(params)}`),
  get: (id: string) => api.get<ItemEnvelope<ServiceDto>>(`/api/services/${id}`),
  create: (body: CreateServiceBody) => api.post<ItemEnvelope<ServiceDto>>('/api/services', body),
  update: (id: string, body: Partial<CreateServiceBody>) =>
    api.patch<ItemEnvelope<ServiceDto>>(`/api/services/${id}`, body),
  retire: (id: string, body: RetireBody) =>
    api.delete<ItemEnvelope<unknown>>(`/api/services/${id}${qs({ reason: body.reason, reasonLabel: body.reasonLabel })}`),
  /** The order of service is replaced whole — the client's arrangement is the arrangement. */
  putLiturgy: (id: string, items: LiturgyItemInput[]) =>
    api.put<ItemEnvelope<LiturgyItemDto[]>>(`/api/services/${id}/liturgy`, { items }),
  /** A census is a handful of rows: "712 adults, 140 children, 23 visitors" is four rows, not one. */
  recordAttendance: (id: string, rows: AttendanceRowInput[]) =>
    api.post<ItemEnvelope<{ recorded: number }>>(`/api/services/${id}/attendance`, { rows }),
  attendanceSummary: (id: string) =>
    api.get<ItemEnvelope<AttendanceSummaryDto>>(`/api/services/${id}/attendance`),
  getReport: (id: string) => api.get<ItemEnvelope<ServiceReportDto>>(`/api/services/${id}/report`),
  putReport: (id: string, body: UpsertServiceReportBody) =>
    api.put<ItemEnvelope<ServiceReportDto>>(`/api/services/${id}/report`, body),
};

export const attendanceApi = {
  list: (params?: { serviceId?: string; memberId?: string; kind?: AttendanceKind; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<AttendanceDto>>(`/api/services/attendance${qs(params)}`),
};

export const rosterApi = {
  list: (params?: { serviceId?: string; memberId?: string; ministryId?: string; status?: DutyStatus; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<DutyDto>>(`/api/services/roster${qs(params)}`),
  createDuty: (serviceId: string, body: { memberId: string; roleTitle: string; ministryId?: string; status?: DutyStatus; notes?: string }) =>
    api.post<ItemEnvelope<DutyDto>>(`/api/services/${serviceId}/roster`, body),
  updateDuty: (dutyId: string, body: { roleTitle?: string; status?: DutyStatus; notes?: string }) =>
    api.patch<ItemEnvelope<DutyDto>>(`/api/services/roster/duty/${dutyId}`, body),
  removeDuty: (dutyId: string) => api.delete<void>(`/api/services/roster/duty/${dutyId}`),
  /** `listSwaps` returns a bare array, so it is unwrapped from `{ data }` with no page meta. */
  listSwaps: (status?: SwapDto['status']) => api.get<ItemEnvelope<SwapDto[]>>(`/api/services/swaps${qs({ status })}`),
  requestSwap: (dutyId: string, body: { replacementId?: string; reason: string }) =>
    api.post<ItemEnvelope<SwapDto>>(`/api/services/roster/duty/${dutyId}/swap`, body),
  /** Deciding is its own endpoint: approving moves the duty and closes the request in one transaction. */
  decideSwap: (swapId: string, body: { decision: 'approved' | 'declined'; note?: string }) =>
    api.post<ItemEnvelope<SwapDto>>(`/api/services/swaps/${swapId}/decision`, body),
};

// ==================== FINANCES ====================
/** Money crosses the wire as a number; Prisma keeps it as Decimal on the way in. */
export type PaymentMethod = 'cash' | 'mpesa' | 'cheque' | 'bank_transfer' | 'card';

export interface TitheDto {
  id: string;
  txCode: string;
  memberId: string | null;
  donorName: string;
  envelopeNo: string | null;
  amount: number;
  method: PaymentMethod;
  category: string;
  reference: string | null;
  status: string;
  receivedAt: string;
  recordedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordTitheBody {
  memberId?: string;
  donorName: string;
  envelopeNo?: string;
  amount: number;
  method: PaymentMethod;
  category?: string;
  reference?: string;
  receivedAt?: string;
}

export interface OfferingDto {
  id: string;
  txCode: string;
  serviceId: string | null;
  amount: number;
  method: PaymentMethod;
  category: string;
  reference: string | null;
  notes: string | null;
  receivedAt: string;
  recordedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordOfferingBody {
  serviceId?: string;
  amount: number;
  method: PaymentMethod;
  category?: string;
  reference?: string;
  notes?: string;
  receivedAt?: string;
}

/** Progress is never stored: it is asked of the contributions every time, so a report and the screen
 * can never disagree with the ledger. `cash` is money banked and `pledges` is money promised — the
 * two are reported apart, because a total that adds them overstates what the church actually holds. */
export interface ProjectFundingDto {
  cash: number;
  pledges: number;
  target: number;
  receivedOrPledged: number;
  outstanding: number;
  percentFunded: number;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  targetAmount: number;
  status: 'planned' | 'active' | 'completed' | 'paused';
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  funding?: ProjectFundingDto;
  contributorCount?: number;
}

export interface ProjectBody {
  name: string;
  description?: string;
  targetAmount: number;
  status?: ProjectDto['status'];
  startsAt?: string;
  endsAt?: string;
}

export interface ContributionDto {
  id: string;
  txCode: string;
  projectId: string;
  memberId: string | null;
  donorName: string;
  amount: number;
  method: PaymentMethod;
  kind: 'cash' | 'pledge';
  reference: string | null;
  contributedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const tithesApi = {
  list: (params?: { q?: string; method?: PaymentMethod; category?: string; memberId?: string; minAmount?: number; from?: string; to?: string; page?: number; pageSize?: number; sort?: 'amount' | 'recent' | 'oldest' }) =>
    api.get<ListEnvelope<TitheDto> & { totals: { amount: number } }>(`/api/finance/tithes${qs(params)}`),
  create: (body: RecordTitheBody) => api.post<ItemEnvelope<TitheDto>>('/api/finance/tithes', body),
  get: (id: string) => api.get<ItemEnvelope<TitheDto>>(`/api/finance/tithes/${id}`),
};

export const offeringsApi = {
  list: (params?: { q?: string; method?: PaymentMethod; category?: string; from?: string; to?: string; page?: number; pageSize?: number; sort?: 'amount' | 'recent' | 'oldest' }) =>
    api.get<ListEnvelope<OfferingDto> & { totals: { amount: number } }>(`/api/finance/offerings${qs(params)}`),
  create: (body: RecordOfferingBody) => api.post<ItemEnvelope<OfferingDto>>('/api/finance/offerings', body),
};

export const projectsApi = {
  list: (params?: { status?: ProjectDto['status']; q?: string; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<ProjectDto>>(`/api/finance/projects${qs(params)}`),
  get: (id: string) => api.get<ItemEnvelope<ProjectDto>>(`/api/finance/projects/${id}`),
  create: (body: ProjectBody) => api.post<ItemEnvelope<ProjectDto>>('/api/finance/projects', body),
  update: (id: string, body: Partial<ProjectBody>) =>
    api.patch<ItemEnvelope<ProjectDto>>(`/api/finance/projects/${id}`, body),
  /** Voiding a project is the finance door's job, not a PATCH — it needs a reason. */
  voidProject: (id: string, body: RetireBody) =>
    api.delete<ItemEnvelope<unknown>>(`/api/finance/project/${id}${qs({ reason: body.reason, reasonLabel: body.reasonLabel })}`),
  contributions: (id: string, params?: { page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<ContributionDto>>(`/api/finance/projects/${id}/contributions${qs(params)}`),
  recordContribution: (id: string, body: { donorName: string; amount: number; method: PaymentMethod; kind?: 'cash' | 'pledge'; memberId?: string; reference?: string }) =>
    api.post<ItemEnvelope<ContributionDto>>(`/api/finance/projects/${id}/contributions`, body),
};

// ==================== COMMUNICATIONS ====================
export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  audience: string;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author?: { id: string; name: string } | null;
}

export interface AnnouncementBody {
  title: string;
  body: string;
  audience?: string;
  isPinned?: boolean;
  publishedAt?: string;
  expiresAt?: string | null;
}

export interface EventDto {
  id: string;
  title: string;
  description: string | null;
  kind: 'service' | 'conference' | 'meeting' | 'outreach';
  venue: string;
  startsAt: string;
  endsAt: string;
  isRecurring: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface EventBody {
  title: string;
  description?: string;
  kind?: EventDto['kind'];
  venue: string;
  startsAt: string;
  endsAt: string;
  isRecurring?: boolean;
}

export interface PrayerRequestDto {
  id: string;
  memberId: string | null;
  requesterName: string | null;
  request: string;
  status: 'open' | 'praying' | 'answered' | 'archived';
  isPrivate: boolean;
  submittedAt: string;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  member?: { id: string; firstName: string; lastName: string } | null;
}

export interface PrayerRequestBody {
  memberId?: string;
  requesterName?: string;
  request: string;
  isPrivate?: boolean;
  status?: PrayerRequestDto['status'];
}

export interface CelebrationDto {
  type: 'birthday' | 'anniversary';
  memberId: string;
  memberName: string;
  initials: string | null;
  phone: string | null;
  date: string;
  inDays: number;
  yearsCount: number | null;
}

export interface CelebrationsMeta {
  window: { days: number; from: string };
  birthdays: number;
  anniversaries: number;
}

export const announcementsApi = {
  list: (params?: { q?: string; audience?: string; isPinned?: boolean; live?: boolean; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<AnnouncementDto>>(`/api/communications/announcements${qs(params)}`),
  create: (body: AnnouncementBody) => api.post<ItemEnvelope<AnnouncementDto>>('/api/communications/announcements', body),
  update: (id: string, body: Partial<AnnouncementBody>) =>
    api.patch<ItemEnvelope<AnnouncementDto>>(`/api/communications/announcements/${id}`, body),
  retire: (id: string) => api.delete<void>(`/api/communications/announcements/${id}`),
};

export const eventsApi = {
  list: (params?: { q?: string; kind?: EventDto['kind']; upcoming?: boolean; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<EventDto>>(`/api/communications/events${qs(params)}`),
  create: (body: EventBody) => api.post<ItemEnvelope<EventDto>>('/api/communications/events', body),
  update: (id: string, body: Partial<EventBody>) => api.patch<ItemEnvelope<EventDto>>(`/api/communications/events/${id}`, body),
  retire: (id: string) => api.delete<void>(`/api/communications/events/${id}`),
};

export const prayerApi = {
  list: (params?: { q?: string; status?: PrayerRequestDto['status']; memberId?: string; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<PrayerRequestDto>>(`/api/communications/prayer-requests${qs(params)}`),
  create: (body: PrayerRequestBody) =>
    api.post<ItemEnvelope<PrayerRequestDto>>('/api/communications/prayer-requests', body),
  update: (id: string, body: Partial<PrayerRequestBody>) =>
    api.patch<ItemEnvelope<PrayerRequestDto>>(`/api/communications/prayer-requests/${id}`, body),
  /** Stamps `answeredAt` for us, so "how long did we pray for that?" stays answerable. */
  answer: (id: string, body: { note?: string } = {}) =>
    api.post<ItemEnvelope<PrayerRequestDto>>(`/api/communications/prayer-requests/${id}/answer`, body),
  retire: (id: string) => api.delete<void>(`/api/communications/prayer-requests/${id}`),
};

export const celebrationsApi = {
  list: (params?: { days?: number; kind?: 'all' | 'birthday' | 'anniversary' }) =>
    api.get<{ data: CelebrationDto[]; meta: CelebrationsMeta }>(`/api/communications/celebrations${qs(params)}`),
};

// ==================== FINANCES: WELFARE ====================
/**
 * Relief the church gives a family. Approval and disbursement are separate acts, deliberately: a
 * committee deciding that a family should receive relief and a treasurer handing over the money are
 * two different people, often weeks apart, and a case that collapses both into one step cannot answer
 * "what has been approved but not yet paid?" — the question a welfare fund lives by.
 */
export type WelfareStatus = 'requested' | 'approved' | 'disbursed' | 'declined';
export type WelfareCategory = 'medical' | 'education' | 'food' | 'funeral' | 'rent' | 'utility' | 'other';

export interface WelfareCaseDto {
  id: string;
  caseCode: string;
  memberId: string | null;
  beneficiaryName: string;
  amount: number;
  purpose: string;
  category: WelfareCategory;
  status: WelfareStatus;
  requestedAt: string;
  assignedToId: string | null;
  approvedById: string | null;
  disbursedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  member: MemberRefWithPhone | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  approvedBy: { id: string; name: string } | null;
}

export interface WelfareListEnvelope {
  data: WelfareCaseDto[];
  meta: PageMeta;
  /** The fund's two running totals: money paid out, and money approved but not yet paid. */
  totals: { disbursed: number; awaitingPayment: number };
}

export interface OpenWelfareBody {
  memberId?: string;
  beneficiaryName: string;
  amount: number;
  purpose: string;
  category?: WelfareCategory;
  assignedToId?: string;
  notes?: string;
}

export const welfareApi = {
  list: (params?: { status?: WelfareStatus; category?: WelfareCategory; memberId?: string; q?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<WelfareListEnvelope>(`/api/finance/welfare${qs(params)}`),
  get: (id: string) => api.get<ItemEnvelope<WelfareCaseDto>>(`/api/finance/welfare/${id}`),
  open: (body: OpenWelfareBody) => api.post<ItemEnvelope<WelfareCaseDto>>('/api/finance/welfare', body),
  /** Both `admin` and above, because a decision about money already promised is not desk work. */
  decide: (id: string, body: { decision: 'approved' | 'declined'; note?: string }) =>
    api.post<ItemEnvelope<WelfareCaseDto>>(`/api/finance/welfare/${id}/decision`, body),
  disburse: (id: string, body: { disbursedAt?: string; note?: string } = {}) =>
    api.post<ItemEnvelope<WelfareCaseDto>>(`/api/finance/welfare/${id}/disburse`, body),
};

// ==================== FINANCES: CHARITY ====================
/** Money or goods the church gives away — an expenditure every row of which somebody must account for. */
export type CharityStatus = 'recorded' | 'verified' | 'flagged';

export interface CharityActivityDto {
  id: string;
  code: string;
  item: string;
  initiative: string;
  vendor: string | null;
  amount: number;
  occurredAt: string;
  status: CharityStatus;
  notes: string | null;
  ledById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ledBy: { id: string; name: string } | null;
}

export interface CharityBody {
  item: string;
  initiative: string;
  vendor?: string;
  amount: number;
  occurredAt?: string;
  status?: CharityStatus;
  notes?: string;
}

export interface CharityListEnvelope {
  data: CharityActivityDto[];
  meta: PageMeta;
  totals: { amount: number | null; byInitiative: Array<{ initiative: string; amount: number }> };
}

export const charityApi = {
  list: (params?: { initiative?: string; status?: CharityStatus; q?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<CharityListEnvelope>(`/api/finance/charity${qs(params)}`),
  get: (id: string) => api.get<ItemEnvelope<CharityActivityDto>>(`/api/finance/charity/${id}`),
  create: (body: CharityBody) => api.post<ItemEnvelope<CharityActivityDto>>('/api/finance/charity', body),
  update: (id: string, body: Partial<CharityBody>) =>
    api.patch<ItemEnvelope<CharityActivityDto>>(`/api/finance/charity/${id}`, body),
};

// ==================== FINANCES: LEDGER, VOIDING, TRASH ====================
export type FinanceAuditAction = 'recorded' | 'voided' | 'restored' | 'approved' | 'declined' | 'disbursed' | 'updated';
export type FinanceEntity = 'tithe' | 'offering' | 'project' | 'contribution' | 'welfare' | 'charity';

/**
 * A line in the chained ledger. Each entry carries a SHA-256 hash over its own fields plus the
 * previous entry's, so altering or removing a row after the fact breaks every hash after it.
 */
export interface FinanceAuditEntryDto {
  id: string;
  sequence: number;
  action: FinanceAuditAction;
  entityName: string;
  entityId: string;
  summary: string;
  amount: number | null;
  actorId: string | null;
  before: unknown;
  after: unknown;
  previousHash: string;
  hash: string;
  createdAt: string;
  actor: { id: string; name: string } | null;
}

export interface FinanceAuditListEnvelope {
  data: FinanceAuditEntryDto[];
  meta: PageMeta;
  totals: { amount: number | null };
}

export interface LedgerVerificationDto {
  entries: number;
  valid: boolean;
  brokenAt: number | null;
  detail: string | null;
}

export interface FinanceSummaryDto {
  period: { from: string | null; to: string | null };
  giving: {
    tithes: { total: number; count: number };
    offerings: { total: number; count: number };
    total: number;
  };
  projects: { cash: number; pledges: number; contributions: number; pledgeCount: number; received: number };
  welfare: { disbursed: number; awaitingPayment: number; declined: number; openCases: number };
  charity: { total: number; count: number };
  givingByMethod: Array<{ method: PaymentMethod; amount: number; count: number }>;
  givingByCategory: Array<{ category: string; amount: number; count: number }>;
}

/** What the Trash reads. The finance trash adds `restorable`: whether the admin door can bring it back. */
export interface SoftDeletedRecordDto {
  id: string;
  entityName: string;
  entityId: string;
  entityLabel: string | null;
  reason: string;
  reasonLabel: string;
  snapshot: unknown;
  deletedAt: string;
  deletedById: string | null;
  restoreDeadline: string | null;
  restoredAt: string | null;
  restoredById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedBy?: { id: string; name: string } | null;
  restoredBy?: { id: string; name: string } | null;
  restorable?: boolean;
}

export const financeApi = {
  /** No date range means all time: defaulting to "this month" would show a treasurer a wall of zeroes. */
  summary: (params?: { from?: string; to?: string }) =>
    api.get<ItemEnvelope<FinanceSummaryDto>>(`/api/finance/summary${qs(params)}`),
  listAudit: (params?: { entityName?: string; action?: FinanceAuditAction; actorId?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<FinanceAuditListEnvelope>(`/api/finance/audit${qs(params)}`),
  /** Recomputes the whole chain and reports the first entry that no longer adds up, if any. `admin`. */
  verifyLedger: () => api.get<ItemEnvelope<LedgerVerificationDto>>('/api/finance/audit/verify'),
  listTrash: (params?: { page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<SoftDeletedRecordDto>>(`/api/finance/trash${qs(params)}`),
  restore: (recordId: string) => api.post<ItemEnvelope<unknown>>(`/api/finance/trash/${recordId}/restore`, {}),
  /**
   * Void, never delete: the row stays, the reason is kept, and the ledger gets a line. Both the
   * reason and its label travel as query parameters, as every retirement in this system does.
   */
  void: (entity: FinanceEntity, id: string, body: { reason: string; reasonLabel: string }) =>
    api.delete<ItemEnvelope<unknown>>(
      `/api/finance/${entity}/${id}${qs({ reason: body.reason, reasonLabel: body.reasonLabel })}`,
    ),
};

// ==================== MINISTRIES ====================
export interface MinistryDto {
  id: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  meetingDay: string | null;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  leader: MemberRef | null;
  members?: MinistryMemberDto[];
  _count?: { members: number };
}

/** One person on a ministry's roll, with the title they hold on it. */
export interface MinistryMemberDto {
  id: string;
  ministryId: string;
  memberId: string;
  roleTitle: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ministry: { id: string; name: string };
  member: MemberRefWithPhone;
}

export interface MinistryBody {
  name: string;
  description?: string;
  leaderId?: string;
  meetingDay?: string;
  location?: string;
  isActive?: boolean;
}

export const ministriesApi = {
  list: (params?: { q?: string; isActive?: boolean; leaderId?: string; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<MinistryDto>>(`/api/ministries${qs(params)}`),
  get: (id: string) => api.get<ItemEnvelope<MinistryDto>>(`/api/ministries/${id}`),
  create: (body: MinistryBody) => api.post<ItemEnvelope<MinistryDto>>('/api/ministries', body),
  update: (id: string, body: Partial<MinistryBody> & { leaderId?: string | null }) =>
    api.patch<ItemEnvelope<MinistryDto>>(`/api/ministries/${id}`, body),
  retire: (id: string, body: RetireBody) =>
    api.delete<ItemEnvelope<unknown>>(`/api/ministries/${id}${qs({ reason: body.reason, reasonLabel: body.reasonLabel })}`),
  addMember: (id: string, body: { memberId: string; roleTitle?: string }) =>
    api.post<ItemEnvelope<MinistryMemberDto>>(`/api/ministries/${id}/members`, body),
  updateMember: (memberRowId: string, body: { roleTitle: string }) =>
    api.patch<ItemEnvelope<MinistryMemberDto>>(`/api/ministries/members/${memberRowId}`, body),
  removeMember: (memberRowId: string) => api.delete<void>(`/api/ministries/members/${memberRowId}`),
  /** Both roster screens are this one query read two ways, rather than two endpoints that disagree. */
  roster: (params?: { q?: string; ministryId?: string; leadershipOnly?: boolean; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<MinistryMemberDto> & { totals: { serving: number } }>(`/api/ministries/roster${qs(params)}`),
};

// ==================== GOVERNANCE ====================
export type MeetingKind = 'stated' | 'executive' | 'emergency';
export type MeetingStatus = 'scheduled' | 'held' | 'cancelled';
export type ResolutionStage = 'proposed' | 'voted_approved' | 'implementing' | 'closed';
export type DocumentKind = 'bylaw' | 'policy' | 'constitution' | 'minutes' | 'certificate' | 'other';

export interface MeetingDto {
  id: string;
  title: string;
  kind: MeetingKind;
  status: MeetingStatus;
  heldAt: string;
  venue: string;
  chairId: string | null;
  secretaryId: string | null;
  attendees: number | null;
  quorumMet: boolean | null;
  agenda: string[] | null;
  minutes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  chair: MemberRef | null;
  secretary: MemberRef | null;
  resolutions?: ResolutionDto[];
  _count?: { resolutions: number };
}

export interface MeetingBody {
  title: string;
  kind?: MeetingKind;
  status?: MeetingStatus;
  heldAt: string;
  venue: string;
  chairId?: string;
  secretaryId?: string;
  attendees?: number;
  quorumMet?: boolean;
  agenda?: string[];
  minutes?: string;
}

export interface ResolutionDto {
  id: string;
  code: string;
  title: string;
  summary: string;
  sponsor: string;
  sponsorOfficer: string | null;
  meetingId: string | null;
  councilDate: string;
  stage: ResolutionStage;
  voteSummary: string | null;
  votesFor: number | null;
  votesAgainst: number | null;
  votesAbstain: number | null;
  lead: string | null;
  leadNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  meeting: { id: string; title: string; heldAt: string; kind: MeetingKind } | null;
}

/** The code is issued by the server in the year's series, so it is never sent from a client. */
export interface ResolutionBody {
  title: string;
  summary: string;
  sponsor: string;
  sponsorOfficer?: string;
  meetingId?: string;
  councilDate: string;
  voteSummary?: string;
  lead?: string;
  leadNote?: string;
}

export interface GovernanceDocumentDto {
  id: string;
  title: string;
  kind: DocumentKind;
  reference: string;
  version: string;
  adoptedAt: string | null;
  body: string | null;
  fileUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DocumentBody {
  title: string;
  kind?: DocumentKind;
  reference: string;
  version?: string;
  adoptedAt?: string;
  body?: string;
  fileUrl?: string;
  isActive?: boolean;
}

/** Lists of meetings, resolutions and documents carry a per-key census beside their page meta. */
type CountedEnvelope<T> = ListEnvelope<T> & { counts: Record<string, number> };

export const governanceApi = {
  listMeetings: (params?: { q?: string; kind?: MeetingKind; status?: MeetingStatus; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<MeetingDto>>(`/api/governance/meetings${qs(params)}`),
  getMeeting: (id: string) => api.get<ItemEnvelope<MeetingDto>>(`/api/governance/meetings/${id}`),
  createMeeting: (body: MeetingBody) => api.post<ItemEnvelope<MeetingDto>>('/api/governance/meetings', body),
  updateMeeting: (id: string, body: Partial<MeetingBody> & { chairId?: string | null; secretaryId?: string | null }) =>
    api.patch<ItemEnvelope<MeetingDto>>(`/api/governance/meetings/${id}`, body),
  retireMeeting: (id: string, body: RetireBody) =>
    api.delete<ItemEnvelope<unknown>>(`/api/governance/meetings/${id}${qs({ reason: body.reason, reasonLabel: body.reasonLabel })}`),

  listResolutions: (params?: { q?: string; stage?: ResolutionStage; sponsor?: string; meetingId?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<CountedEnvelope<ResolutionDto>>(`/api/governance/resolutions${qs(params)}`),
  getResolution: (id: string) => api.get<ItemEnvelope<ResolutionDto>>(`/api/governance/resolutions/${id}`),
  createResolution: (body: ResolutionBody) => api.post<ItemEnvelope<ResolutionDto>>('/api/governance/resolutions', body),
  updateResolution: (id: string, body: Partial<ResolutionBody> & { meetingId?: string | null }) =>
    api.patch<ItemEnvelope<ResolutionDto>>(`/api/governance/resolutions/${id}`, body),
  /** A vote is its own act, with its own endpoint — never a field a general PATCH could change. */
  decideResolution: (id: string, body: { decision: 'voted_approved' | 'closed'; voteSummary: string; votesFor?: number; votesAgainst?: number; votesAbstain?: number; decidedAt?: string }) =>
    api.post<ItemEnvelope<ResolutionDto>>(`/api/governance/resolutions/${id}/decision`, body),
  retireResolution: (id: string, body: RetireBody) =>
    api.delete<ItemEnvelope<unknown>>(`/api/governance/resolutions/${id}${qs({ reason: body.reason, reasonLabel: body.reasonLabel })}`),

  listDocuments: (params?: { q?: string; kind?: DocumentKind; isActive?: boolean; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<CountedEnvelope<GovernanceDocumentDto>>(`/api/governance/documents${qs(params)}`),
  getDocument: (id: string) => api.get<ItemEnvelope<GovernanceDocumentDto>>(`/api/governance/documents/${id}`),
  createDocument: (body: DocumentBody) => api.post<ItemEnvelope<GovernanceDocumentDto>>('/api/governance/documents', body),
  updateDocument: (id: string, body: Partial<DocumentBody>) =>
    api.patch<ItemEnvelope<GovernanceDocumentDto>>(`/api/governance/documents/${id}`, body),
  retireDocument: (id: string, body: RetireBody) =>
    api.delete<ItemEnvelope<unknown>>(`/api/governance/documents/${id}${qs({ reason: body.reason, reasonLabel: body.reasonLabel })}`),
};

// ==================== REPORTS ====================
export interface AuditLogDto {
  id: string;
  actorId: string | null;
  action: 'create' | 'update' | 'delete' | 'restore' | 'login';
  entityName: string;
  entityId: string;
  summary: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; name: string; email?: string } | null;
}

/** The home screen's four cards plus its activity feed, so a dashboard is one request, not six. */
export interface ReportOverviewDto {
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
  nextEvents: EventDto[];
  lastService: ServiceDto | null;
  recentActivity: AuditLogDto[];
}

export interface MemberReportDto {
  total: number;
  byStatus: Record<string, number>;
  byLocation: Array<{ location: string; members: number }>;
  households: { total: number; household: number; single: number; large: number };
  joinedByYear: Array<{ year: string; members: number }>;
}

export interface GivingReportDto {
  period: { from: string | null; to: string | null };
  tithes: { total: number; count: number };
  offerings: { total: number; count: number };
  total: number;
  byMonth: Array<{ month: string; tithes: number; offerings: number; total: number }>;
  byMethod: Array<{ method: PaymentMethod; amount: number; count: number }>;
  byCategory: Array<{ category: string; amount: number; count: number }>;
  projects: { cash: number; pledges: number };
}

export interface AttendanceReportDto {
  period: { from: string | null; to: string | null };
  servicesHeld: number;
  attendanceRows: number;
  totalCounted: number;
  averagePerService: number;
  byKind: Record<string, { counted: number; rows: number }>;
  byService: Array<{ serviceId: string; title: string; heldAt: string; venue: string; counted: number }>;
}

export interface MinistryReportDto {
  ministries: Array<{
    id: string;
    name: string;
    isActive: boolean;
    meetingDay: string | null;
    leader: { id: string; firstName: string; lastName: string } | null;
    members: number;
    needsAttention: boolean;
  }>;
  total: number;
  active: number;
  serving: number;
  withoutALeader: number;
  /** Named members who serve nowhere — the invitation list, and the reason this report exists. */
  activeMembersServingNowhere: number;
}

export interface GovernanceReportDto {
  period: { from: string | null; to: string | null };
  meetings: { byKind: Record<string, number>; byStatus: Record<string, number>; total: number };
  resolutions: { byStage: Record<string, number>; total: number };
  documents: { byKind: Record<string, number> };
  recentMeetings: Array<{ id: string; title: string; kind: MeetingKind; status: MeetingStatus; heldAt: string; attendees: number | null; quorumMet: boolean | null }>;
  recentResolutions: Array<{ id: string; code: string; title: string; stage: ResolutionStage; sponsor: string; councilDate: string }>;
}

export type ReportRange = { from?: string; to?: string };

export const reportsApi = {
  overview: (params?: ReportRange) => api.get<ItemEnvelope<ReportOverviewDto>>(`/api/reports/overview${qs(params)}`),
  members: () => api.get<ItemEnvelope<MemberReportDto>>('/api/reports/members'),
  giving: (params?: ReportRange) => api.get<ItemEnvelope<GivingReportDto>>(`/api/reports/giving${qs(params)}`),
  attendance: (params?: ReportRange) => api.get<ItemEnvelope<AttendanceReportDto>>(`/api/reports/attendance${qs(params)}`),
  ministries: () => api.get<ItemEnvelope<MinistryReportDto>>('/api/reports/ministries'),
  governance: (params?: ReportRange) => api.get<ItemEnvelope<GovernanceReportDto>>(`/api/reports/governance${qs(params)}`),
};

// ==================== SETTINGS ====================
/** One row, created on first save rather than by a migration, so a fresh install has no placeholder. */
export interface OrganizationProfileDto {
  id: string | null;
  name: string;
  tagline: string | null;
  location: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  vision: string | null;
  mission: string | null;
  coreValues: string[];
  serviceTimes: Record<string, string> | null;
  socials: Record<string, string> | null;
  /** The uploaded logo, as a file id. `null` when the church has not set one. */
  logoFileId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ProfileBody {
  name?: string;
  tagline?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  vision?: string;
  mission?: string;
  coreValues?: string[];
  serviceTimes?: Record<string, string>;
  socials?: Record<string, string>;
  /** `null` removes the logo; leaving it out leaves the current one alone. */
  logoFileId?: string | null;
}

export type SettingKey = 'notifications' | 'integrations' | 'customization';

export interface AppSettingDto {
  id: string;
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: { id: string; name: string } | null;
}

export interface BackupManifestDto {
  records: Record<string, number>;
  totalRecords: number;
  archivedAwaitingRestore: number;
  lastWrite: { at: string; summary: string | null } | null;
  ledger: { entries: number; at: string | null };
  /** Stated rather than implied: this endpoint reports, it does not export. */
  exportAvailable: boolean;
}

export const settingsApi = {
  getProfile: () => api.get<ItemEnvelope<OrganizationProfileDto>>('/api/settings/profile'),
  updateProfile: (body: ProfileBody) => api.patch<ItemEnvelope<OrganizationProfileDto>>('/api/settings/profile', body),
  listPreferences: () => api.get<ItemEnvelope<AppSettingDto[]>>('/api/settings/preferences'),
  getPreference: (key: SettingKey) => api.get<ItemEnvelope<AppSettingDto>>(`/api/settings/preferences/${key}`),
  updatePreference: (key: SettingKey, value: Record<string, unknown>) =>
    api.put<ItemEnvelope<AppSettingDto>>(`/api/settings/preferences/${key}`, { value }),
  backup: () => api.get<ItemEnvelope<BackupManifestDto>>('/api/settings/preferences/backup'),
};

// ==================== ADMIN: TRASH, AUDIT, RIGHTS ====================
export interface RoleDto {
  id: string;
  key: string;
  name: string;
  description: string | null;
  panels: Record<string, boolean>;
  actions: Record<string, boolean>;
  users: number;
}

export interface RoleBody {
  name?: string;
  description?: string;
  panels?: Record<string, boolean>;
  actions?: Record<string, boolean>;
}

export interface TrashListEnvelope {
  data: SoftDeletedRecordDto[];
  meta: PageMeta;
  totals: { awaitingRestore: number; byEntity: Record<string, number>; byReason: Record<string, number> };
}

export interface AuditListEnvelope {
  data: AuditLogDto[];
  meta: PageMeta;
  totals: { byAction: Record<string, number>; byEntity: Record<string, number> };
}

/** One record's whole history, read back from both logs, oldest first. */
export interface RecordHistoryDto {
  entityName: string;
  entityId: string;
  audit: AuditLogDto[];
  finance: Array<{
    sequence: number;
    action: FinanceAuditAction;
    summary: string;
    actor: { id: string; name: string } | null;
    hash: string;
    previousHash: string;
    createdAt: string;
  }>;
}

export const adminApi = {
  listTrash: (params?: { entityName?: string; q?: string; includeRestored?: boolean; page?: number; pageSize?: number }) =>
    api.get<TrashListEnvelope>(`/api/admin/trash${qs(params)}`),
  restore: (recordId: string) => api.post<ItemEnvelope<unknown>>(`/api/admin/trash/${recordId}/restore`, {}),
  listAudit: (params?: { q?: string; action?: AuditLogDto['action']; entityName?: string; entityId?: string; actorId?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    api.get<AuditListEnvelope>(`/api/admin/audit${qs(params)}`),
  recordHistory: (entityName: string, entityId: string) =>
    api.get<ItemEnvelope<RecordHistoryDto>>(`/api/admin/audit/${encodeURIComponent(entityName)}/${encodeURIComponent(entityId)}`),
  listRoles: () => api.get<ItemEnvelope<RoleDto[]>>('/api/admin/roles'),
  getRole: (key: string) => api.get<ItemEnvelope<RoleDto>>(`/api/admin/roles/${encodeURIComponent(key)}`),
  /** Changing rights is `super_admin` only: a role is what grants access in the first place. */
  updateRole: (key: string, body: RoleBody) => api.patch<ItemEnvelope<RoleDto>>(`/api/admin/roles/${encodeURIComponent(key)}`, body),
  createRole: (body: RoleBody & { key: string; name: string }) => api.post<ItemEnvelope<RoleDto>>('/api/admin/roles', body),
};

// ==================== ADMIN: USERS ====================
/** What a client may see of an account. The password hash never crosses this boundary. */
export interface AdminUserDto {
  id: string;
  name: string;
  email: string;
  roleKey: string | null;
  /** The register record this account belongs to, or null for an office login. */
  memberId: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export const usersApi = {
  list: (params?: { q?: string; roleKey?: string; isActive?: boolean; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<AdminUserDto>>(`/api/admin/users${qs(params)}`),
  create: (body: { name: string; email: string; password: string; roleKey?: string; memberId?: string }) =>
    api.post<ItemEnvelope<AdminUserDto>>('/api/admin/users', body),
  update: (id: string, body: { name?: string; email?: string; isActive?: boolean }) =>
    api.patch<ItemEnvelope<AdminUserDto>>(`/api/admin/users/${id}`, body),
  assignRole: (id: string, roleKey: string) =>
    api.post<ItemEnvelope<AdminUserDto>>(`/api/admin/users/${id}/role`, { roleKey }),
  remove: (id: string, body: { reason: string; reasonLabel: string }) =>
    api.delete<ItemEnvelope<unknown>>(`/api/admin/users/${id}${qs({ reason: body.reason, reasonLabel: body.reasonLabel })}`),
};

// ==================== FILES ====================
export type FilePurpose = 'logo' | 'member_photo' | 'document' | 'certificate_template' | 'other';

/** The metadata of an uploaded file. The bytes have their own endpoint. */
export interface StoredFileDto {
  id: string;
  purpose: FilePurpose;
  fileName: string;
  mimeType: string;
  byteSize: number;
  uploadedById: string | null;
  createdAt: string;
}

export interface UploadFileBody {
  purpose: FilePurpose;
  fileName: string;
  mimeType: string;
  /** Raw base64, or a `data:` URL — the server strips the prefix. */
  content: string;
}

/**
 * Uploads.
 *
 * Files are fetched as blobs rather than pointed at with a bare `<img src>`: every request carries the
 * bearer token, and an image tag cannot send one. `useFileUrl` turns a fetched blob into an object
 * URL and revokes it on unmount, which is what keeps a member's photograph behind the same auth as
 * the rest of the console.
 */
export const filesApi = {
  list: (params?: { purpose?: FilePurpose; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<StoredFileDto>>(`/api/files${qs(params)}`),
  meta: (id: string) => api.get<ItemEnvelope<StoredFileDto>>(`/api/files/${id}/meta`),
  upload: (body: UploadFileBody) => api.post<ItemEnvelope<StoredFileDto>>('/api/files', body),
  remove: (id: string) => api.delete<ItemEnvelope<StoredFileDto>>(`/api/files/${id}`),
  download: (id: string) => api.get<Blob>(`/api/files/${id}`),
};

// ==================== COMMUNICATIONS: CHANNELS & BROADCASTS ====================
/** Whether outbound email and SMS can actually send, read before the console offers a Send action. */
export interface ChannelStatusDto {
  driver: string;
  configured: boolean;
  from?: string;
}

export interface ChannelsDto {
  email: ChannelStatusDto;
  sms: { driver: string; configured: boolean };
}

export interface BroadcastDto {
  id: string;
  channel: 'sms' | 'email' | 'notice_sheet';
  subject: string | null;
  body: string;
  audience: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  scheduledFor: string | null;
  sentAt: string | null;
  recipients: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** The per-recipient outcome a send reports back. */
export interface BroadcastDeliveryDto {
  channel: string;
  driver: string | null;
  audienceLabel: string;
  attempted: number;
  delivered: number;
  failed: number;
  failures: Array<{ recipient: string; reason: string }>;
  recordedOnly: boolean;
}

export type BroadcastSendResultDto = BroadcastDto & { delivery: BroadcastDeliveryDto };

export interface BroadcastBody {
  channel: BroadcastDto['channel'];
  subject?: string;
  body: string;
  audience: string;
  scheduledFor?: string;
}

export const broadcastsApi = {
  list: (params?: { q?: string; channel?: BroadcastDto['channel']; status?: BroadcastDto['status']; page?: number; pageSize?: number }) =>
    api.get<ListEnvelope<BroadcastDto>>(`/api/communications/broadcasts${qs(params)}`),
  create: (body: BroadcastBody) => api.post<ItemEnvelope<BroadcastDto>>('/api/communications/broadcasts', body),
  update: (id: string, body: Partial<BroadcastBody>) =>
    api.patch<ItemEnvelope<BroadcastDto>>(`/api/communications/broadcasts/${id}`, body),
  /** `recipients` is only sent for a notice sheet, which has no gateway to count for it. */
  send: (id: string, body: { recipients?: number } = {}) =>
    api.post<ItemEnvelope<BroadcastSendResultDto>>(`/api/communications/broadcasts/${id}/send`, body),
  retire: (id: string) => api.delete<void>(`/api/communications/broadcasts/${id}`),
};

export const communicationsApi = {
  channels: () => api.get<ItemEnvelope<ChannelsDto>>('/api/communications/channels'),
};
