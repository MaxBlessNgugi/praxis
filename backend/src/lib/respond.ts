import type { Response } from 'express';

/**
 * The response shape, in one place.
 *
 * A single item is `{ data }`, a list is `{ data, meta }`, and a failure is `{ error }` — written
 * once here so a client parses every endpoint the same way. The reason this is a function rather
 * than a convention is that a convention is what drifts: three controllers honouring a shape by hand
 * become three shapes the first time someone is in a hurry.
 */
export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

/**
 * The meta for one page of a list, beside the type it returns.
 *
 * `pages` is the part nobody should recompute, which is why this is a function rather than a shape
 * each list builds by hand.
 */
export function page(total: number, query: { page: number; pageSize: number }): PageMeta {
  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    pages: Math.ceil(total / query.pageSize),
  };
}

export function ok<T>(res: Response, data: T, meta?: PageMeta): void {
  res.json(meta ? { data, meta } : { data });
}

export function created<T>(res: Response, data: T): void {
  res.status(201).json({ data });
}

export function noContent(res: Response): void {
  res.status(204).send();
}
