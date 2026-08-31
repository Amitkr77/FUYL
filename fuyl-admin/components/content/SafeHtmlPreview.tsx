'use client'

export function SafeHtmlPreview({ html }: { html: string }) {
  const body = html.trim() || '<p style="color:#94a3b8">Nothing to preview yet.</p>'
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:16px;color:#0f172a;font:14px/1.65 Inter,system-ui,sans-serif}img{max-width:100%;height:auto}a{color:#558476}table{border-collapse:collapse;width:100%}td,th{border:1px solid #e2e8f0;padding:8px}pre{white-space:pre-wrap}</style></head><body>${body}</body></html>`

  return (
    <iframe
      title="Safe page preview"
      sandbox=""
      srcDoc={srcDoc}
      className="min-h-[420px] w-full rounded-lg border border-slate-200 bg-white"
    />
  )
}
