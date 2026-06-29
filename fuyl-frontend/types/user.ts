export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
}

export interface Address {
  id: string
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  state: string
  pincode: string
  country: string
  phone: string
}

export interface OrderLineItem {
  id: string
  name: string
  quantity: number
  price: number
  image: string
}

export interface Order {
  id: string
  orderNumber: string
  createdAt: string
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  items: OrderLineItem[]
  subtotal: number
  shipping: number
  total: number
  trackingUrl?: string
}
