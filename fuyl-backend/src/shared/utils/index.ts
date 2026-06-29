import { Request } from 'express';
import { PaginationInput } from '../validators';

export function getPagination(req: Request): PaginationInput {
  return {
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    sort: (req.query.sort as string) || undefined,
    order: (req.query.order as 'asc' | 'desc') || 'desc',
  };
}

export function toObjectIdFilter(id: string) {
  return { _id: id };
}

export function buildSort(sort?: string, order?: 'asc' | 'desc') {
  if (!sort) return { createdAt: order === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
  return { [sort]: order === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}
