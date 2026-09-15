import { useState, useCallback } from 'react';
import { api, ApiError } from '../api';
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
}

export interface UpdateMemberInput extends Partial<CreateMemberInput> {}

export interface RetireMemberInput {
  reason: 'transferred' | 'relocated' | 'deceased' | 'request' | 'disciplinary' | 'duplicate' | 'other';
  reasonLabel: string;
  destinationParish?: string;
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

export interface UpdateHouseholdInput extends Partial<CreateHouseholdInput> {}

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
      const response = await api.get<ListMembersResponse>(path);
      return response;
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to load members';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMember = useCallback(async (id: string): Promise<ParishMember> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<{ data: ParishMember }>(`/api/members/${id}`);
      return response.data;
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
      const response = await api.post<{ data: ParishMember }>('/api/members', input);
      return response.data;
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
      const response = await api.patch<{ data: ParishMember }>(`/api/members/${id}`, input);
      return response.data;
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
      const response = await api.post<{ data: { entityName: string; entityId: string; restoredAt: string; record: ParishMember } }>(`/api/members/trash/${id}/restore`, {});
      return response.data;
    } catch (err) {
      const message = err instanceof ApiError ? err.body.error : 'Failed to restore member';
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
      const response = await api.get<ListHouseholdsResponse>(path);
      return response;
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
      const response = await api.get<{ data: HouseholdUnit }>(`/api/households/${id}`);
      return response.data;
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
      const response = await api.post<{ data: HouseholdUnit }>('/api/households', input);
      return response.data;
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
      const response = await api.patch<{ data: HouseholdUnit }>(`/api/households/${id}`, input);
      return response.data;
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
      const response = await api.post<{ data: HouseholdUnit }>(`/api/households/${householdId}/members`, input);
      return response.data;
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
      const response = await api.post<{ data: HouseholdUnit }>(`/api/households/${householdId}/head`, input);
      return response.data;
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

  return {
    isLoading,
    error,
    listMembers,
    getMember,
    createMember,
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