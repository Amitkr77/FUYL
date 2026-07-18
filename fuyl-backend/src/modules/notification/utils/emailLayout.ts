/**
 * Shared HTML shell for transactional emails. Table-based layout with inline
 * styles throughout — the only markup that renders consistently across
 * Outlook/Gmail/Apple Mail, none of which reliably support external
 * stylesheets or flexbox/grid in email. Colors match the frontend's brand
 * palette (fuyl-frontend/styles/globals.css's --color-brand-* tokens) so
 * emails feel like the same product as the site.
 *
 * `{{logoUrl}}` and `{{year}}` are populated centrally in
 * notification.service.ts's processOne() for every email-channel send —
 * individual templates don't need to pass them.
 */

const COLOR = {
  forest: '#12291F',
  teal: '#558476',
  sage: '#DDE8C8',
  cream: '#EEF4E4',
  border: '#C8D8B0',
  muted: '#4A5A3A',
  white: '#FFFFFF',
};

const FONT = 'Arial, Helvetica, sans-serif';

export function emailButton(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td style="border-radius:2px;background-color:${COLOR.forest};">
      <a href="${url}" style="display:inline-block;padding:14px 36px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${COLOR.white};text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>`;
}

/** A muted, small-print fallback link line — for when the button doesn't render (some clients strip styled anchors). */
export function emailFallbackLink(url: string): string {
  return `<p style="margin:4px 0 0;font-size:12px;color:${COLOR.muted};">Or copy this link: <a href="${url}" style="color:${COLOR.teal};">${url}</a></p>`;
}

export function emailDetailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 0;font-size:13px;color:${COLOR.muted};border-bottom:1px solid ${COLOR.border};">${label}</td>
    <td style="padding:8px 0;font-size:13px;color:${COLOR.forest};font-weight:700;text-align:right;border-bottom:1px solid ${COLOR.border};">${value}</td>
  </tr>`;
}

export function emailDetailsTable(rowsHtml: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;border-top:1px solid ${COLOR.border};">${rowsHtml}</table>`;
}

export function emailBadge(text: string, tone: 'success' | 'warning' | 'muted' = 'muted'): string {
  const bg = tone === 'success' ? COLOR.sage : tone === 'warning' ? '#FEF3C7' : COLOR.cream;
  const fg = tone === 'warning' ? '#92400E' : COLOR.forest;
  return `<span style="display:inline-block;padding:4px 12px;border-radius:2px;background-color:${bg};color:${fg};font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">${text}</span>`;
}

export function emailWrap(innerHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>FUYL</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLOR.cream};-webkit-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.cream};padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:${COLOR.white};border-radius:12px;overflow:hidden;border:1px solid ${COLOR.border};">
            <tr>
              <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid ${COLOR.border};">
                <img src="{{logoUrl}}" alt="FUYL" width="110" style="display:inline-block;border:0;outline:none;max-width:110px;" />
              </td>
            </tr>
            <tr>
              <td style="padding:36px 32px;font-family:${FONT};font-size:15px;line-height:1.65;color:${COLOR.forest};">
                ${innerHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:${COLOR.cream};padding:24px 32px;text-align:center;font-family:${FONT};">
                <p style="margin:0 0 8px;font-size:12px;color:${COLOR.muted};">FUYL Nutrition &middot; Longer. Stronger. You.</p>
                <p style="margin:0;font-size:11px;color:${COLOR.muted};">&copy; {{year}} Fuyl. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
