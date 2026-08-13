'use client'

import { useEffect, useState } from 'react'
import { useAffiliate }          from '@/lib/hooks/useAffiliate'
import { getAffiliateLinks, createAffiliateLink, type AffiliateLink } from '@/lib/api/affiliate'
import { getErrorMessage }       from '@/lib/api/client'
import { CopyButton }            from '@/components/affiliate/shared/CopyButton'
import { QRCodePanel }           from '@/components/affiliate/shared/QRCodePanel'
import { SocialShareBar }        from '@/components/affiliate/shared/SocialShareBar'
import { Skeleton }              from '@/components/ui/Skeleton'
import { ExternalLink, Link as LinkIcon, Plus, Tag } from 'lucide-react'

// ─── Link card ────────────────────────────────────────────────────────────────

function LinkCard({ link }: { link: AffiliateLink }) {
  const [showQR, setShowQR] = useState(false)

  return (
    <div className="bg-white border border-brand-border rounded-xl overflow-hidden">
      {/* URL row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-brand-border/40">
        <Tag size={13} className="text-brand-muted shrink-0" />
        <div className="flex-1 min-w-0">
          {link.label && (
            <p className="text-body-xs font-semibold text-brand-forest mb-0.5">{link.label}</p>
          )}
          <p className="text-body-xs font-mono text-brand-muted truncate">{link.trackingUrl}</p>
        </div>
        <CopyButton text={link.trackingUrl} size="sm" />
        <a
          href={link.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-brand-muted hover:text-brand-forest hover:bg-brand-sage/40 transition-colors"
          aria-label="Open link"
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Actions row */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2">
        <SocialShareBar url={link.trackingUrl} />
        <button
          type="button"
          onClick={() => setShowQR((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider border border-brand-border rounded-lg text-brand-muted hover:bg-brand-sage/50 hover:text-brand-forest transition-colors"
        >
          {showQR ? 'Hide QR' : 'QR Code'}
        </button>
      </div>

      {/* QR */}
      {showQR && (
        <div className="flex justify-center px-4 py-5 border-t border-brand-border/40 bg-brand-cream/30">
          <QRCodePanel url={link.trackingUrl} label={link.label ?? link.code} />
        </div>
      )}
    </div>
  )
}

// ─── Create link form ─────────────────────────────────────────────────────────

interface CreateLinkFormProps {
  onCreated: (link: AffiliateLink) => void
  token:     string
}

function CreateLinkForm({ onCreated, token }: CreateLinkFormProps) {
  const [dest,     setDest]     = useState('')
  const [label,    setLabel]    = useState('')
  const [source,   setSource]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dest.trim()) return
    setLoading(true)
    setError('')
    try {
      // Append ?source= if provided
      const destination = source.trim()
        ? `${dest.trim()}?source=${encodeURIComponent(source.trim())}`
        : dest.trim()
      const link = await createAffiliateLink(token, { destination, label: label.trim() || undefined })
      onCreated(link)
      setDest('')
      setLabel('')
      setSource('')
    } catch (err) {
      setError(getErrorMessage(err, 'Could not create link.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleCreate} className="bg-white border border-brand-border rounded-xl p-5 space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-brand-forest flex items-center gap-2">
        <Plus size={13} /> Generate New Link
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Destination */}
        <div className="sm:col-span-1 flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
            Destination Path <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            placeholder="/products/fuyl-complete"
            required
            className="h-9 px-3 text-body-xs bg-brand-cream/40 border border-brand-border rounded-lg outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
          />
        </div>

        {/* Source / UTM */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
            Source / UTM (optional)
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="instagram_bio"
            className="h-9 px-3 text-body-xs bg-brand-cream/40 border border-brand-border rounded-lg outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
          />
        </div>

        {/* Label */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
            Label (optional)
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Instagram Bio"
            className="h-9 px-3 text-body-xs bg-brand-cream/40 border border-brand-border rounded-lg outline-none focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 transition-all"
          />
        </div>
      </div>

      {error && <p className="text-body-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !dest.trim()}
        className="px-6 py-2.5 bg-brand-forest text-white text-label tracking-wider uppercase rounded-lg hover:bg-brand-olive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating…' : 'Create Link'}
      </button>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const { token } = useAffiliate()

  const [links,   setLinks]   = useState<AffiliateLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!token) return
    getAffiliateLinks(token)
      .then(setLinks)
      .catch((err) => setError(getErrorMessage(err, 'Could not load links.')))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <LinkIcon size={18} className="text-brand-forest" />
        <h1 className="text-display-md font-display text-brand-forest">MARKETING TOOLS</h1>
      </div>

      {/* Create form */}
      <CreateLinkForm
        token={token}
        onCreated={(link) => setLinks((prev) => [...prev, link])}
      />

      {/* Link list */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
          Your Links ({links.length})
        </p>

        {error && (
          <p className="text-body-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="bg-white border border-brand-border rounded-xl p-8 text-center text-brand-muted text-body-sm">
            No links yet — create your first link above.
          </div>
        ) : (
          links.map((link) => <LinkCard key={link._id} link={link} />)
        )}
      </div>
    </div>
  )
}
