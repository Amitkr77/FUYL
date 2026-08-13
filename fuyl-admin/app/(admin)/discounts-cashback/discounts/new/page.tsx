import { DiscountForm } from '@/components/discounts/DiscountForm'
import { listAdminProducts } from '@/lib/products'
export default async function NewDiscountPage() {
  const products = await listAdminProducts()
  return <div className="space-y-5"><h1 className="text-2xl font-bold text-slate-900">Create discount</h1><DiscountForm products={products.map(({ id, name }) => ({ id, name }))} /></div>
}
