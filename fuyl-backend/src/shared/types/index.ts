export interface BaseEntity {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUser {
  userId: string;
  role: string;
  email: string;
}

export interface Money {
  amount: number;
  currency: string;
}

export interface Address {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  landmark?: string;
  type: 'home' | 'office' | 'other';
  isDefault?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
