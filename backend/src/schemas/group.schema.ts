import { z } from 'zod';
import { booleanQuery } from './common';

const groupFields = z.object({
  name: z.string().trim().min(2, 'Name the group').max(120),
  description: z.string().trim().max(2000).optional(),
  leaderId: z.string().uuid().optional(),
  meetingDay: z.string().trim().max(20).optional(),
  location: z.string().trim().max(160).optional(),
  isActive: z.boolean().default(true),
});

export const createGroupSchema = groupFields;

export const updateGroupSchema = groupFields
  .partial()
  .extend({ leaderId: z.string().uuid().nullable().optional() })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

export const listGroupsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  isActive: booleanQuery.optional(),
  leaderId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** Putting somebody on a group's roll, with the part they play in it. */
export const addGroupMemberSchema = z.object({
  memberId: z.string().uuid(),
  roleTitle: z.string().trim().min(2, 'Name the role').max(80).default('Member'),
});

export const updateGroupMemberSchema = z
  .object({ roleTitle: z.string().trim().min(2).max(80) })
  .refine((value) => Object.keys(value).length > 0, { message: 'Send at least one field to change' });

/** One gathering of a group, recorded by whoever hosted it. */
export const createGroupMeetingSchema = z.object({
  metAt: z.coerce.date(),
  hostName: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  attendedCount: z.coerce.number().int().min(0).max(10000).default(0),
});

export const updateGroupMeetingSchema = createGroupMeetingSchema.partial();

export const listGroupMeetingsQuerySchema = z.object({
  groupId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>;
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;
export type UpdateGroupMemberInput = z.infer<typeof updateGroupMemberSchema>;
export type CreateGroupMeetingInput = z.infer<typeof createGroupMeetingSchema>;
export type UpdateGroupMeetingInput = z.infer<typeof updateGroupMeetingSchema>;
export type ListGroupMeetingsQuery = z.infer<typeof listGroupMeetingsQuerySchema>;
