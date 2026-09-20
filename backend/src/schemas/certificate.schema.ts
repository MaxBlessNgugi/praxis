import { z } from 'zod';
import { retireReasonSchema } from './common';

/**
 * What the certificate register accepts.
 *
 * The wording is taken as the clerk types it, because a certificate certifies a ceremony as it
 * happened — including one recorded in a register Praxis never held — so every field that prints is
 * captured at issue time rather than looked up from the member's row later.
 */

const certificateKindSchema = z.enum(['baptism', 'dedication']);

export const issueCertificateSchema = z.object({
  kind: certificateKindSchema,
  fullName: z.string().trim().min(2, 'Name the person the certificate is for').max(160),
  /** The roll's own register number, cited on the certificate when the person is on the roll. */
  memberId: z.string().uuid().optional(),
  memberNumber: z.string().trim().max(40).optional(),
  /** The parents presenting a child for dedication. */
  parents: z.string().trim().max(200).optional(),
  ceremonyDate: z.coerce.date(),
  officiant: z.string().trim().max(160).optional(),
  scripture: z.string().trim().max(120).optional(),
});

export const listCertificatesQuerySchema = z.object({
  kind: certificateKindSchema.optional(),
  memberId: z.string().uuid().optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const reissueCertificateSchema = z.object({
  officiant: z.string().trim().max(160).optional(),
});

/** The same shape every retirement takes: a category the Trash counts, and the sentence a person wrote. */
export const retireCertificateSchema = retireReasonSchema;

export type RetireReason = z.infer<typeof retireReasonSchema>;

export type CertificateKind = z.infer<typeof certificateKindSchema>;
export type CreateCertificateInput = z.infer<typeof issueCertificateSchema>;
export type ListCertificatesQuery = z.infer<typeof listCertificatesQuerySchema>;
export type ReissueCertificateInput = z.infer<typeof reissueCertificateSchema>;
