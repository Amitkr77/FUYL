/**
 * "Your answers are saved — continue where you left off" email. Deliberately
 * contains no health answers (email isn't a private channel): just progress
 * and a link. Table-based, inline-styled HTML; every dynamic value escaped.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const FONT = "Inter,Helvetica,Arial,sans-serif";

export function buildResumeEmail(input: { name?: string; percent: number; minutesLeft: number; resumeUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const { name, percent, minutesLeft, resumeUrl } = input;
  const hi = name ? `Hi ${esc(name)},` : "Hi,";
  const left = minutesLeft <= 1 ? "about a minute" : `about ${minutesLeft} minutes`;
  const subject = name ? `${name}, your FUYL assessment is saved — ${left} to go` : `Your FUYL assessment is saved — ${left} to go`;
  const pct = Math.max(1, Math.min(99, Math.round(percent)));

  const html = `<!doctype html><html><body style="margin:0;background:#f6f9f1">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9f1;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;padding:32px 28px">
        <tr><td style="font:500 11px/1 ${FONT};letter-spacing:.2em;text-transform:uppercase;color:#558476">FUYL · Wellness assessment</td></tr>
        <tr><td style="font:700 26px/1.25 ${FONT};letter-spacing:-0.5px;color:#12291f;padding-top:14px">${hi} your answers are saved.</td></tr>
        <tr><td style="font:15px/1.6 ${FONT};color:#4a5a3a;padding-top:10px">You're ${pct}% of the way through your personalised assessment. Pick up exactly where you left off — it takes ${left}, and your report is sent to this address when you finish.</td></tr>
        <tr><td style="padding-top:18px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="background:#e6efe0;border-radius:999px;height:8px;line-height:8px;font-size:0">
              <div style="width:${pct}%;background:#3f6b5e;border-radius:999px;height:8px;line-height:8px;font-size:0">&nbsp;</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td align="center" style="padding:26px 0 6px">
          <a href="${esc(resumeUrl)}" style="display:inline-block;background:#12291f;color:#ffffff;text-decoration:none;font:600 15px/1 ${FONT};padding:16px 28px;border-radius:999px">Continue my assessment</a>
        </td></tr>
        <tr><td style="font:12px/1.6 ${FONT};color:#7a8a6a;padding-top:22px;border-top:1px solid #dde8c8">
          This link opens your saved assessment on any device — keep it to yourself. You'll only get this one reminder. Your answers are deleted automatically after 30 days if you don't finish.
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;

  const text = [
    `${name ? `Hi ${name},` : "Hi,"} your answers are saved.`,
    "",
    `You're ${pct}% of the way through your personalised FUYL assessment — ${left} to go.`,
    `Continue where you left off: ${resumeUrl}`,
    "",
    "This link opens your saved assessment on any device — keep it to yourself. You'll only get this one reminder.",
  ].join("\n");

  return { subject, html, text };
}
