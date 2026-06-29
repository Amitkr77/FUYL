import { revalidatePath } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/revalidate
 * Called by the Node backend whenever products/content are updated.
 * Body: { secret: string, path: string }
 * Examples: path="/" | "/products/fuyl-complete" | "/collections/all"
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { secret, path } = body

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'Missing path' }, { status: 400 })
  }

  revalidatePath(path)
  return NextResponse.json({ revalidated: true, path, ts: Date.now() })
}
