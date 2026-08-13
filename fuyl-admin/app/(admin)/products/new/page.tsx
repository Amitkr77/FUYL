import { getAttributes } from '@/lib/products'
import { getTags } from '@/lib/tags'
import { ProductForm } from '@/components/products/ProductForm'

export default async function NewProductPage() {
  const [attributes, tags] = await Promise.all([getAttributes(), getTags()])
  return <ProductForm isNew attributes={attributes} tags={tags} />
}
