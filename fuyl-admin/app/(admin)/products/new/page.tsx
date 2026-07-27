import { getCategories, getAttributes } from '@/lib/products'
import { getTags } from '@/lib/tags'
import { ProductForm } from '@/components/products/ProductForm'

export default async function NewProductPage() {
  const [categories, attributes, tags] = await Promise.all([getCategories(), getAttributes(), getTags()])
  return <ProductForm isNew categories={categories} attributes={attributes} tags={tags} />
}
