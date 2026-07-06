export const MOCK_STATS = {
  revenue: 284500,
  orders: 189,
  customers: 1243,
  products: 8,
}

export type ProductStatus = 'active' | 'draft' | 'archived'

export interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  status: ProductStatus
  category: string
}

export const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', name: 'FUYL COMPLETE+', sku: 'FC-15', price: 1499, stock: 234, status: 'active', category: 'Nutrition' },
  { id: 'p2', name: 'FUYL COMPLETE+ (30 sachets)', sku: 'FC-30', price: 2699, stock: 187, status: 'active', category: 'Nutrition' },
  { id: 'p3', name: 'FUYL STARTER PACK', sku: 'FS-01', price: 999, stock: 56, status: 'active', category: 'Bundle' },
  { id: 'p4', name: 'FUYL IMMUNITY BOOST', sku: 'FI-15', price: 1299, stock: 0, status: 'draft', category: 'Immunity' },
  { id: 'p5', name: 'FUYL ENERGY BLEND', sku: 'FE-15', price: 1399, stock: 12, status: 'draft', category: 'Energy' },
  { id: 'p6', name: 'FUYL GUT HEALTH', sku: 'FG-15', price: 1249, stock: 8, status: 'draft', category: 'Gut Health' },
  { id: 'p7', name: 'FUYL WOMEN\'S FORMULA', sku: 'FW-15', price: 1549, stock: 0, status: 'archived', category: 'Nutrition' },
  { id: 'p8', name: 'FUYL MENS FORMULA', sku: 'FM-15', price: 1549, stock: 0, status: 'archived', category: 'Nutrition' },
]

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  customer: string
  email: string
  date: string
  items: number
  total: number
  status: OrderStatus
}

export const MOCK_ORDERS: Order[] = [
  { id: 'ORD-1089', customer: 'Priya Sharma', email: 'priya.sharma@gmail.com', date: '2025-06-30', items: 2, total: 4198, status: 'delivered' },
  { id: 'ORD-1088', customer: 'Rahul Mehta', email: 'rahul.mehta@gmail.com', date: '2025-06-30', items: 1, total: 1499, status: 'shipped' },
  { id: 'ORD-1087', customer: 'Anjali Kapoor', email: 'anjali.k@outlook.com', date: '2025-06-29', items: 3, total: 5697, status: 'processing' },
  { id: 'ORD-1086', customer: 'Vikram Singh', email: 'vikram.s@gmail.com', date: '2025-06-29', items: 1, total: 2699, status: 'delivered' },
  { id: 'ORD-1085', customer: 'Neha Gupta', email: 'neha.gupta@yahoo.com', date: '2025-06-28', items: 2, total: 2998, status: 'shipped' },
  { id: 'ORD-1084', customer: 'Arjun Nair', email: 'arjun.nair@gmail.com', date: '2025-06-28', items: 1, total: 999, status: 'cancelled' },
  { id: 'ORD-1083', customer: 'Shreya Patel', email: 'shreya.patel@gmail.com', date: '2025-06-27', items: 2, total: 4198, status: 'delivered' },
  { id: 'ORD-1082', customer: 'Karan Joshi', email: 'karan.joshi@gmail.com', date: '2025-06-27', items: 1, total: 1499, status: 'delivered' },
  { id: 'ORD-1081', customer: 'Divya Reddy', email: 'divya.reddy@gmail.com', date: '2025-06-26', items: 3, total: 7097, status: 'delivered' },
  { id: 'ORD-1080', customer: 'Amit Kumar', email: 'amit.kumar@gmail.com', date: '2025-06-26', items: 1, total: 2699, status: 'processing' },
  { id: 'ORD-1079', customer: 'Sunita Bose', email: 'sunita.bose@gmail.com', date: '2025-06-25', items: 2, total: 3198, status: 'delivered' },
  { id: 'ORD-1078', customer: 'Rohan Malhotra', email: 'rohan.m@outlook.com', date: '2025-06-25', items: 1, total: 1499, status: 'delivered' },
  { id: 'ORD-1077', customer: 'Pooja Iyer', email: 'pooja.iyer@gmail.com', date: '2025-06-24', items: 2, total: 4198, status: 'shipped' },
  { id: 'ORD-1076', customer: 'Sanjay Verma', email: 'sanjay.v@gmail.com', date: '2025-06-24', items: 1, total: 999, status: 'pending' },
  { id: 'ORD-1075', customer: 'Ritu Agarwal', email: 'ritu.agarwal@gmail.com', date: '2025-06-23', items: 3, total: 5897, status: 'delivered' },
]

export interface Customer {
  id: string
  name: string
  email: string
  orders: number
  totalSpent: number
  joined: string
}

export const MOCK_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Priya Sharma', email: 'priya.sharma@gmail.com', orders: 5, totalSpent: 12495, joined: '2024-11-15' },
  { id: 'c2', name: 'Rahul Mehta', email: 'rahul.mehta@gmail.com', orders: 3, totalSpent: 6297, joined: '2025-01-22' },
  { id: 'c3', name: 'Anjali Kapoor', email: 'anjali.k@outlook.com', orders: 7, totalSpent: 18993, joined: '2024-09-08' },
  { id: 'c4', name: 'Vikram Singh', email: 'vikram.s@gmail.com', orders: 2, totalSpent: 4198, joined: '2025-03-14' },
  { id: 'c5', name: 'Neha Gupta', email: 'neha.gupta@yahoo.com', orders: 4, totalSpent: 8996, joined: '2024-12-03' },
  { id: 'c6', name: 'Arjun Nair', email: 'arjun.nair@gmail.com', orders: 1, totalSpent: 999, joined: '2025-05-30' },
  { id: 'c7', name: 'Shreya Patel', email: 'shreya.patel@gmail.com', orders: 6, totalSpent: 15594, joined: '2024-10-19' },
  { id: 'c8', name: 'Karan Joshi', email: 'karan.joshi@gmail.com', orders: 3, totalSpent: 5397, joined: '2025-02-11' },
  { id: 'c9', name: 'Divya Reddy', email: 'divya.reddy@gmail.com', orders: 9, totalSpent: 22491, joined: '2024-08-25' },
  { id: 'c10', name: 'Amit Kumar', email: 'amit.kumar@gmail.com', orders: 2, totalSpent: 4198, joined: '2025-04-07' },
  { id: 'c11', name: 'Sunita Bose', email: 'sunita.bose@gmail.com', orders: 4, totalSpent: 9596, joined: '2025-01-18' },
  { id: 'c12', name: 'Rohan Malhotra', email: 'rohan.m@outlook.com', orders: 2, totalSpent: 3998, joined: '2025-06-02' },
]

export type ContentStatus = 'published' | 'draft'

export interface ContentPage {
  id: string
  name: string
  slug: string
  lastEdited: string
  status: ContentStatus
}

export const MOCK_CONTENT_PAGES: ContentPage[] = [
  { id: 'home', name: 'Homepage', slug: '/', lastEdited: '2025-06-28', status: 'published' },
  { id: 'why-fuyl', name: 'Why FUYL', slug: '/pages/why-fuyl', lastEdited: '2025-06-25', status: 'published' },
  { id: 'science', name: 'The Science', slug: '/pages/science', lastEdited: '2025-06-20', status: 'published' },
  { id: 'our-story', name: 'Our Story', slug: '/pages/our-story', lastEdited: '2025-06-18', status: 'published' },
  { id: 'ingredients', name: 'Ingredients', slug: '/pages/ingredients', lastEdited: '2025-06-15', status: 'published' },
  { id: 'contact', name: 'Contact', slug: '/pages/contact', lastEdited: '2025-06-10', status: 'published' },
  { id: 'faq', name: 'FAQ', slug: '/pages/faq', lastEdited: '2025-05-30', status: 'draft' },
]

export type BlogStatus = 'published' | 'draft'

export interface BlogPost {
  id: string
  title: string
  category: string
  status: BlogStatus
  author: string
  date: string
  views: number
}

export const MOCK_BLOG_POSTS: BlogPost[] = [
  { id: 'b1', title: 'Why Magnesium Glycinate is Superior to Magnesium Oxide', category: 'Nutrition Science', status: 'published', author: 'Dr. Rima Khanna', date: '2025-06-20', views: 1842 },
  { id: 'b2', title: 'The Truth About Proprietary Blends in Supplements', category: 'Industry Insights', status: 'published', author: 'FUYL Team', date: '2025-06-12', views: 2310 },
  { id: 'b3', title: 'KSM-66 Ashwagandha: What the Research Actually Says', category: 'Ingredients', status: 'published', author: 'Dr. Rima Khanna', date: '2025-06-05', views: 3120 },
  { id: 'b4', title: 'Building Your Morning Routine Around FUYL', category: 'Lifestyle', status: 'draft', author: 'FUYL Team', date: '2025-07-01', views: 0 },
  { id: 'b5', title: 'Understanding Bioavailability in Nutrition', category: 'Nutrition Science', status: 'draft', author: 'Anjali Mehta', date: '2025-07-01', views: 0 },
]

export interface ChartDataPoint {
  date: string
  revenue: number
  orders: number
}

export const MOCK_REVENUE_CHART: ChartDataPoint[] = [
  { date: 'Jun 25', revenue: 18400, orders: 12 },
  { date: 'Jun 26', revenue: 24200, orders: 16 },
  { date: 'Jun 27', revenue: 19800, orders: 13 },
  { date: 'Jun 28', revenue: 31500, orders: 21 },
  { date: 'Jun 29', revenue: 27300, orders: 18 },
  { date: 'Jun 30', revenue: 38900, orders: 26 },
  { date: 'Jul 01', revenue: 22400, orders: 15 },
]

const ORDER_CATALOGUE = [
  { name: 'FUYL COMPLETE+ (15 sachets)', price: 1499 },
  { name: 'FUYL COMPLETE+ (30 sachets)', price: 2699 },
  { name: 'FUYL STARTER PACK', price: 999 },
]

export function getOrderLineItems(order: Order) {
  return Array.from({ length: order.items }, (_, i) => ({
    ...ORDER_CATALOGUE[i % ORDER_CATALOGUE.length],
    qty: 1,
  }))
}

const ADDRESSES = [
  { street: '12, Koramangala 4th Block', city: 'Bengaluru', state: 'Karnataka', pincode: '560034' },
  { street: '45, Green Park Extension', city: 'New Delhi', state: 'Delhi', pincode: '110016' },
  { street: '7A, Linking Road, Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400058' },
  { street: '22, MG Road, Camp', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
  { street: '8, Banjara Hills Road No. 3', city: 'Hyderabad', state: 'Telangana', pincode: '500034' },
  { street: '91, Anna Salai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600002' },
]

export function getOrderAddress(order: Order) {
  const idx = parseInt(order.id.replace('ORD-', '')) % ADDRESSES.length
  return ADDRESSES[idx]
}

export function getOrderById(id: string) {
  return MOCK_ORDERS.find((o) => o.id === id) ?? null
}

export function getProductById(id: string) {
  return MOCK_PRODUCTS.find((p) => p.id === id) ?? null
}

export function getCustomerById(id: string) {
  return MOCK_CUSTOMERS.find((c) => c.id === id) ?? null
}

export function getBlogPostById(id: string) {
  return MOCK_BLOG_POSTS.find((p) => p.id === id) ?? null
}

export function getCustomerOrders(customerEmail: string) {
  return MOCK_ORDERS.filter((o) => o.email === customerEmail)
}
