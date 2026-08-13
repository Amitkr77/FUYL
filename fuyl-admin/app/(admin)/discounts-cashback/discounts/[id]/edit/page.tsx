import { notFound } from 'next/navigation'
import { DiscountForm } from '@/components/discounts/DiscountForm'
import { getDiscount } from '@/lib/discounts'
import { listAdminProducts } from '@/lib/products'

export default async function EditDiscountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [discount, products] = await Promise.all([getDiscount(id), listAdminProducts()])
  if (!discount) notFound()
  return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-slate-900">Edit discount</h1><p className="mt-1 text-sm text-slate-500">Update the shared rule, coupon codes, limits and schedule.</p></div><DiscountForm initial={discount} products={products.map(({ id: productId, name }) => ({ id: productId, name }))} /></div>
}
