import type { UploadSignature } from '@/lib/api/upload'

// Uploads a file directly from the browser to Cloudinary using a short-lived
// signature the backend issues (POST /uploads/sign) — the file itself never
// passes through our server. Throws on failure so callers can use the same
// try/catch + getErrorMessage pattern as the rest of the app's API calls.
export async function uploadImage(file: File, signature: UploadSignature): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('api_key', signature.apiKey)
  formData.append('timestamp', String(signature.timestamp))
  formData.append('signature', signature.signature)
  formData.append('folder', signature.folder)

  let res: Response
  try {
    res = await fetch(signature.uploadUrl, { method: 'POST', body: formData })
  } catch {
    throw new Error('Could not reach the upload service.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error?.message ?? 'Upload failed.')
  }

  const json = await res.json()
  return json.secure_url as string
}
