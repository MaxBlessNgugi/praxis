import type { Request, Response } from 'express';
import * as certificateService from '../services/certificate.service';
import { actor, id } from '../lib/request';
import { created, ok } from '../lib/respond';
import {
  issueCertificateSchema,
  listCertificatesQuerySchema,
  reissueCertificateSchema,
  retireCertificateSchema,
} from '../schemas/certificate.schema';

export async function listCertificates(req: Request, res: Response): Promise<void> {
  ok(res, await certificateService.listCertificates(listCertificatesQuerySchema.parse(req.query)));
}

export async function getCertificate(req: Request, res: Response): Promise<void> {
  ok(res, await certificateService.getCertificate(id(req)));
}

export async function issueCertificate(req: Request, res: Response): Promise<void> {
  created(res, await certificateService.issueCertificate(issueCertificateSchema.parse(req.body), actor(req)));
}

export async function reissueCertificate(req: Request, res: Response): Promise<void> {
  ok(res, await certificateService.reissueCertificate(id(req), reissueCertificateSchema.parse(req.body), actor(req)));
}

export async function retireCertificate(req: Request, res: Response): Promise<void> {
  ok(res, await certificateService.retireCertificate(id(req), retireCertificateSchema.parse(req.query), actor(req)));
}
