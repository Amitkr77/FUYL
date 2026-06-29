import { apiFetch } from './client'
import type { User, Order } from '@/types/user'

export async function login(payload: { email: string; password: string }): Promise<{ token: string; user: User }> {
  return apiFetch('/auth/login', { method: 'POST', body: payload })
}

export async function register(payload: {
  firstName: string
  lastName:  string
  email:     string
  password:  string
  phone?:    string
}): Promise<{ token: string; user: User }> {
  return apiFetch('/auth/register', { method: 'POST', body: payload })
}

export async function getProfile(token: string): Promise<User> {
  return apiFetch('/account/profile', { token })
}

export async function updateProfile(
  token:   string,
  payload: Partial<User>
): Promise<User> {
  return apiFetch('/account/profile', { method: 'PATCH', body: payload, token })
}

export async function getOrders(token: string): Promise<Order[]> {
  return apiFetch('/account/orders', { token })
}

export async function getOrder(token: string, orderId: string): Promise<Order> {
  return apiFetch(`/account/orders/${orderId}`, { token })
}

export async function forgotPassword(email: string): Promise<void> {
  return apiFetch('/auth/forgot-password', { method: 'POST', body: { email } })
}
