import { adminApiFetch, adminApiFetchPaginated, AdminApiError } from './api'
import type { OrderStatus } from './orders'

interface BackendCustomer {
  id:    string
  name:  string
  email: string
  phone?: string
  joined: string
  orders: number
  totalSpent: number
}

interface BackendCustomerOrder {
  id: string
  orderNumber: string
  date: string
  itemCount: number
  total: number
  status: OrderStatus
}

interface BackendCustomerDetail {
  id:    string
  name:  string
  email: string
  phone?: string
  joined: string
  ordersCount: number
  totalSpent: number
  orders: BackendCustomerOrder[]
}

export interface Customer {
  id:    string
  name:  string
  email: string
  phone: string
  joined: string
  orders: number
  totalSpent: number
}

export interface CustomerDetail extends Customer {
  orderHistory: BackendCustomerOrder[]
}

export interface CustomerStats {
  totalCustomers: number
  purchasingCustomers: number
  repeatCustomers: number
  totalRevenue: number
}

function mapCustomer(c: BackendCustomer): Customer {
  return { id: c.id, name: c.name, email: c.email, phone: c.phone ?? '', joined: c.joined, orders: c.orders, totalSpent: c.totalSpent }
}

export async function listCustomers(): Promise<Customer[]> {
  const customers: Customer[] = []
  const limit = 200
  let page = 1

  // The Customers screen performs segment filtering, sorting, pagination and
  // CSV export over this collection. Fetch every backend page deliberately so
  // those operations never describe/export only an arbitrary first page.
  while (true) {
    const result = await adminApiFetchPaginated<BackendCustomer>(
      `/admin/customers?page=${page}&limit=${limit}`,
    )
    customers.push(...result.items.map(mapCustomer))
    if (!result.meta.hasNext) break
    page += 1
  }

  return customers
}

export async function getCustomerStats(): Promise<CustomerStats> {
  return adminApiFetch<CustomerStats>('/admin/customers/stats')
}

export async function searchCustomers(query: string, limit = 10): Promise<Customer[]> {
  if (!query.trim()) return []
  const qs = new URLSearchParams({ search: query.trim(), limit: String(limit) })
  const raw = await adminApiFetch<BackendCustomer[]>(`/admin/customers?${qs.toString()}`)
  return raw.map(mapCustomer)
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  try {
    const raw = await adminApiFetch<BackendCustomerDetail>(`/admin/customers/${id}`)
    return {
      id: raw.id, name: raw.name, email: raw.email, phone: raw.phone ?? '', joined: raw.joined,
      orders: raw.ordersCount, totalSpent: raw.totalSpent,
      orderHistory: raw.orders,
    }
  } catch {
    return null
  }
}

export { AdminApiError }
