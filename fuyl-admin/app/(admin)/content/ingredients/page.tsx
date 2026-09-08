import { IngredientsManager } from '@/components/content/IngredientsManager'
import { listAdminIngredients } from '@/lib/content'

export default async function IngredientsPage() {
  const items = await listAdminIngredients()
  const storefrontUrl = (process.env.STOREFRONT_URL ?? process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://fuyl.in').replace(/\/$/, '')
  return <IngredientsManager items={items} storefrontUrl={storefrontUrl} />
}
