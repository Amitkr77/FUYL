import { Response } from 'express';

export interface PaginatedMeta<T = unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  items?: T[];
}

export function success<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({ success: true, data });
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function paginate<T>(
  res: Response,
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  const meta: PaginatedMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
  return res.status(200).json({ success: true, data: items, meta });
}

export function accepted<T>(res: Response, data: T) {
  return res.status(202).json({ success: true, data });
}
