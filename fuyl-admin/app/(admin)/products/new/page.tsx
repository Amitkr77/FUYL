import { getCategories, getAttributes } from '@/lib/products'
import { ProductForm } from '@/components/products/ProductForm'

export default async function NewProductPage() {
  const [categories, attributes] = await Promise.all([getCategories(), getAttributes()])
  return <ProductForm isNew categories={categories} attributes={attributes} />
}
