'use client'

// Uploads a file directly from the browser to Cloudinary, using a
// short-lived signature the backend issues (POST /uploads/sign) — the file
// itself never passes through our server. `getSignature` is injected so
// this stays independent of any one Server Action.

export interface UploadSignature {
  timestamp: number
  signature: string
  apiKey:    string
  cloudName: string
  folder:    string
  uploadUrl: string
}

export type SignatureResult = UploadSignature | { error: string }

export async function uploadImage(
  file: File,
  getSignature: () => Promise<SignatureResult>
): Promise<{ url: string } | { error: string }> {
  const sig = await getSignature()
  if ('error' in sig) return sig

  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', sig.apiKey)
  formData.append('timestamp', String(sig.timestamp))
  formData.append('signature', sig.signature)
  formData.append('folder', sig.folder)

  let res: Response
  try {
    res = await fetch(sig.uploadUrl, { method: 'POST', body: formData })
  } catch {
    return { error: 'Could not reach the upload service.' }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    return { error: body?.error?.message ?? 'Upload failed.' }
  }

  const json = await res.json()
  return { url: json.secure_url as string }
}
