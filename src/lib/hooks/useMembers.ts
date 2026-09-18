import { useState, useCallback } from 'react';
import { api, ApiError } from '../api';
import type { HouseholdDto, ListEnvelope, MemberDto } from '../api';
import { toHouseholdUnit, toParishMember } from '../adapters';
import type { ParishMember, HouseholdUnit, SoftDeleteRecord } from '../../types';

export interface ListMembersQuery {
  q?: string;
  status?: 'active' | 'transferred' | 'deceased' | 'inactive';
  baptismType?: 'baptized' | 'dedicated' | 'none';
  location?: string;
  householdId?: string;
  headsOnly?: boolean;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'recent' | 'oldest';
}

export interface ListMembersResponse {
  data: ParishMember[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}

export interface CreateMemberInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  nationalId?: string;
  dateOfBirth?: string;
  location: string;
  householdId?: string;
  householdRole?: string;
  isHouseholdHead?: boolean;
  status?: 'active' | 'transferred' | 'deceased' | 'inactive';
  baptismType?: 'baptized' | 'dedicated' | 'none';
  baptismDate?: string;
  baptismOfficiant?: string;
  envelopeNumber?: string;
  pastoralNotes?: string;
  tags?: string[];
  /** Set after the photograph has been uploaded; the upload itself goes through `/api/files`. */
  photoFileId?: string | null;
}

export type UpdateMemberInput = Partial<CreateMemberInput>;

export interface RetireMemberInput {
  reason: 'transferred' | 'relocated' | 'deceased' | 'request' | 'disciplinary' | 'duplicate' | 'other';
  reasonLabel: string;
  destinationParish?: string;
}

/** The register's fields a spreadsheet column may fill. */
export type MemberImportField =
  | 'firstName'
  | 'lastName'
  | 'location'
  | 'email'
  | 'phone'
  | 'nationalId'
  | 'dateOfBirth'
  | 'status'
  | 'baptismType'
  | 'baptismDate'
  | 'baptismOfficiant'
  | 'envelopeNumber'
  | 'tags'
  | 'pastoralNotes';

/** Which column of the file holds which field, by zero-based column position. */
export interface MemberImportColumn {
  index: number;
  field: MemberImportField;
}

export interface MemberImportInput {
  csv: string;
  /** Absent on the first call, which is how the console asks what the file's columns are. */
  columns?: MemberImportColumn[];
  /** For a file with no congregation column: the one every row belongs to. */
  defaultLocation?: string;
  /** True — a report only — unless this is the request that writes. */
  dryRun?: boolean;
}

export interface MemberImportRowReport {
  row: number;
  name: string;
  status: 'create' | 'duplicate' | 'invalid';
  errors: { field: string; message: string }[];
  duplicateOf?: { memberId: string; name: string; matchedOn: string; retired: boolean };
}

export interface MemberImportReport {
  headers: string[];
  rowCount: number;
  mapped: boolean;
  dryRun: boolean;
  missingRequired: MemberImportField[];
  summary: { create: number; duplicate: number; invalid: number };
  rows: MemberImportRowReport[];
  truncated: boolean;
  /** Rows written by this request; zero on anything that only reported. */
  imported: number;
}

export interface ListHouseholdsQuery {
  q?: string;
  location?: string;
  page?: number;
  pageSize?: number;
}

export interface ListHouseholdsResponse {
  data: HouseholdUnit[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}

export interface CreateHouseholdInput {
  name: string;
  unitNumber: string;
  location: string;
  address?: string;
}

export type UpdateHouseholdInput = Partial<CreateHouseholdInput>;

export interface LinkMemberInput {
  memberId: string;
  householdRole?: string;
  makeHead?: boolean;
}

export interface SetHeadInput {
  memberId: string;
}

export function useMembers() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listMembers = useCallback(async (query: ListMembersQuery = {}): Promise<ListMembersResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const path = `/api/members${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<ListEnvelope<MemberDto>>(path);
      return { data: response.data.map(toParishMember), meta: response.meta };
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to load members';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Every page of a list, for the screens that need the whole thing rather than one page of it — a
   * picker that has to hold everybody, a card that counts households.
   *
   * The API caps a page at 100 and refuses a larger one outright, so "ask for 1000" is a request that
   * never arrives; walking the pages is how a caller gets all of them. The first page's count decides
   * how many more there are, so the list cannot shift under the reader between one page and the next.
   */
  const listAll = useCallback(
    async <T>(fetchPage: (page: number) => Promise<{ data: T[]; meta: { pages: number } }>): Promise<T[]> => {
      const first = await fetchPage(1);
      const rest: T[] = [];
      for (let page = 2; page <= first.meta.pages; page += 1) {
        rest.push(...(await fetchPage(page)).data);
      }
      return [...first.data, ...rest];
    },
    [],
  );

  const getMember = useCallback(async (id: string): Promise<ParishMember> => {
    setIsLoading(true);
    setError(null);
    try {
      // The single-record read is the one that carries the member's ministries, which the row above
      // does not: the register lists people, not their service.
      const response = await api.get<{ data: MemberDto }>(`/api/members/${id}`);
      return toParishMember(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to load member';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createMember = useCallback(async (input: CreateMemberInput): Promise<ParishMember> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ data: MemberDto }>('/api/members', input);
      return toParishMember(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to create member';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateMember = useCallback(async (id: string, input: UpdateMemberInput): Promise<ParishMember> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.patch<{ data: MemberDto }>(`/api/members/${id}`, input);
      return toParishMember(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to update member';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retireMember = useCallback(async (id: string, input: RetireMemberInput): Promise<SoftDeleteRecord> => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        reason: input.reason,
        reasonLabel: input.reasonLabel,
      });
      if (input.destinationParish) {
        params.append('destinationParish', input.destinationParish);
      }
      const response = await api.delete<{ data: SoftDeleteRecord }>(`/api/members/${id}?${params.toString()}`);
      return response.data;
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to retire member';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restoreMember = useCallback(async (id: string): Promise<{ entityName: string; entityId: string; restoredAt: string; record: ParishMember }> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{
        data: { entityName: string; entityId: string; restoredAt: string; record: MemberDto };
      }>(`/api/members/trash/${id}/restore`, {});
      return { ...response.data, record: toParishMember(response.data.record) };
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to restore member';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * The register as a spreadsheet.
   *
   * One call, three questions: with no columns it asks the server what the file holds, with `dryRun`
   * it asks what each row would do, and only a request that repeats the file with `dryRun: false`
   * writes. The parsing and the rules live on the server, so the console and the import agree by
   * construction rather than by both being edited.
   */
  const importMembers = useCallback(async (input: MemberImportInput): Promise<MemberImportReport> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ data: MemberImportReport }>('/api/members/import', input);
      return response.data;
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to read the file';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Households
  const listHouseholds = useCallback(async (query: ListHouseholdsQuery = {}): Promise<ListHouseholdsResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const path = `/api/households${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get<ListEnvelope<HouseholdDto>>(path);
      return { data: response.data.map(toHouseholdUnit), meta: response.meta };
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to load households';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getHousehold = useCallback(async (id: string): Promise<HouseholdUnit> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: HouseholdDto }>(`/api/households/${id}`);
      return toHouseholdUnit(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to load household';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createHousehold = useCallback(async (input: CreateHouseholdInput): Promise<HouseholdUnit> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ data: HouseholdDto }>('/api/households', input);
      return toHouseholdUnit(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to create household';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateHousehold = useCallback(async (id: string, input: UpdateHouseholdInput): Promise<HouseholdUnit> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.patch<{ data: HouseholdDto }>(`/api/households/${id}`, input);
      return toHouseholdUnit(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to update household';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const linkMember = useCallback(async (householdId: string, input: LinkMemberInput): Promise<HouseholdUnit> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ data: HouseholdDto }>(`/api/households/${householdId}/members`, input);
      return toHouseholdUnit(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to link member';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setHead = useCallback(async (householdId: string, input: SetHeadInput): Promise<HouseholdUnit> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{ data: HouseholdDto }>(`/api/households/${householdId}/head`, input);
      return toHouseholdUnit(response.data);
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to set head';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unlinkMember = useCallback(async (householdId: string, memberId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      await api.delete(`/api/households/${householdId}/members/${memberId}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to unlink member';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const retireHousehold = useCallback(async (id: string, input: RetireMemberInput): Promise<SoftDeleteRecord> => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        reason: input.reason,
        reasonLabel: input.reasonLabel,
      });
      const response = await api.delete<{ data: SoftDeleteRecord }>(`/api/households/${id}?${params.toString()}`);
      return response.data;
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to retire household';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** The whole register, for the screens that choose a member rather than page through them. */
  const listAllMembers = useCallback(
    (query: Omit<ListMembersQuery, 'page' | 'pageSize'> = {}) =>
      listAll((page) => listMembers({ ...query, page, pageSize: 100 })),
    [listAll, listMembers],
  );

  /** Every household, for the household register and the record dialog's picker. */
  const listAllHouseholds = useCallback(
    (query: Omit<ListHouseholdsQuery, 'page' | 'pageSize'> = {}) =>
      listAll((page) => listHouseholds({ ...query, page, pageSize: 100 })),
    [listAll, listHouseholds],
  );

  return {
    isLoading,
    error,
    listMembers,
    listAllMembers,
    listAllHouseholds,
    getMember,
    createMember,
    importMembers,
    updateMember,
    retireMember,
    restoreMember,
    listHouseholds,
    getHousehold,
    createHousehold,
    updateHousehold,
    linkMember,
    setHead,
    unlinkMember,
    retireHousehold,
  };
}