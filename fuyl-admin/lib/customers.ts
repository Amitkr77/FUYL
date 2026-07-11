import { adminApiFetch, AdminApiError } from './api'
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

function mapCustomer(c: BackendCustomer): Customer {
  return { id: c.id, name: c.name, email: c.email, phone: c.phone ?? '', joined: c.joined, orders: c.orders, totalSpent: c.totalSpent }
}

export async function listCustomers(): Promise<Customer[]> {
  const raw = await adminApiFetch<BackendCustomer[]>('/admin/customers?limit=50')
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
