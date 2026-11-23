import type { AssessmentResult } from "@/engine";
import { DISCLAIMER } from "@/kb/copy";

/**
 * The emailed report: a short version of the result page with a link back to
 * it. Table-based, inline-styled HTML for broad email-client support. Every
 * dynamic value is HTML-escaped.
 */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const LEVEL: Record<string, string> = { high: "High match", moderate: "Moderate match", mild: "Mild match" };

export function buildReportEmail(input: {
  result: AssessmentResult;
  resultUrl: string;
  productUrl: string;
  productTitle: string;
  priceFrom: number;
}): { subject: string; html: string; text: string } {
  const { result, resultUrl, productUrl, productTitle, priceFrom } = input;
  const name = result.name ? esc(result.name) : "there";
  const subject = result.name ? `${result.name}, your FUYL wellness report is ready` : "Your FUYL wellness report is ready";

  const areas = result.areas
    .map(
      (a) => `
      <tr><td style="padding:18px 0;border-top:1px solid #dde8c8">
        <div style="font:600 17px/1.3 Inter,Helvetica,Arial,sans-serif;color:#12291f">${esc(a.name)}
          <span style="font:500 11px/1 Inter,Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#558476;margin-left:8px">${LEVEL[a.level]}</span>
        </div>
        ${a.reasons.length ? `<div style="font:14px/1.6 Inter,Helvetica,Arial,sans-serif;color:#4a5a3a;margin-top:6px">${a.reasons.map(esc).join(" · ")}</div>` : ""}
        <div style="font:13px/1.7 Inter,Helvetica,Arial,sans-serif;color:#12291f;margin-top:8px"><strong>COMPLETE+ ingredients for you:</strong> ${a.ingredients
          .map((i) => esc(i.name + (i.dose ? ` (${i.dose})` : "")))
          .join(", ")}</div>
      </td></tr>`,
    )
    .join("");

  const findings = result.findings
    ? `<tr><td style="padding:18px 20px;background:#eef4e4;border-radius:14px">
        <div style="font:500 11px/1 Inter,Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#3f6b5e">Summary of your findings</div>
        <div style="font:600 17px/1.4 Inter,Helvetica,Arial,sans-serif;color:#12291f;margin-top:10px">${esc(result.findings.headline)}</div>
        <ul style="margin:10px 0 0;padding-left:18px;font:14px/1.6 Inter,Helvetica,Arial,sans-serif;color:#12291f">${result.findings.points.map((p) => `<li style="margin-top:4px">${esc(p.text)}</li>`).join("")}</ul>
      </td></tr><tr><td style="height:12px"></td></tr>`
    : "";

  const safety = result.safety.notes.length
    ? `<tr><td style="padding:16px 18px;background:#fff7ef;border-radius:12px;font:14px/1.6 Inter,Helvetica,Arial,sans-serif;color:#5a3a1a">
        <strong>Before you start</strong><br>${result.safety.notes.map((n) => `${esc(n.title)} — ${esc(n.message)}`).join("<br><br>")}
      </td></tr><tr><td style="height:20px"></td></tr>`
    : "";

  const cta = result.showProduct
    ? `<tr><td align="center" style="padding:28px 0 8px">
        <a href="${esc(productUrl)}" style="display:inline-block;background:#12291f;color:#ffffff;text-decoration:none;font:600 15px/1 Inter,Helvetica,Arial,sans-serif;padding:16px 28px;border-radius:999px">View ${esc(productTitle)} on fuyl.in</a>
        <div style="font:12px/1.6 Inter,Helvetica,Arial,sans-serif;color:#4a5a3a;margin-top:10px">From ₹${priceFrom.toLocaleString("en-IN")}</div>
      </td></tr>`
    : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f6f9f1">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9f1;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;padding:32px 28px">
        <tr><td style="font:500 11px/1 Inter,Helvetica,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#558476">FUYL · Wellness report</td></tr>
        <tr><td style="font:700 28px/1.2 Inter,Helvetica,Arial,sans-serif;letter-spacing:-0.5px;color:#12291f;padding-top:14px">Hi ${name}, here's your match.</td></tr>
        <tr><td style="height:18px"></td></tr>
        ${findings}
        <tr><td style="font:15px/1.6 Inter,Helvetica,Arial,sans-serif;color:#4a5a3a;padding-top:6px">Your focus areas — and the COMPLETE+ ingredients that support each one:</td></tr>
        <tr><td style="height:4px"></td></tr>
        ${areas}
        <tr><td style="height:16px"></td></tr>
        ${safety}
        <tr><td align="center"><a href="${esc(resultUrl)}" style="font:600 14px/1 Inter,Helvetica,Arial,sans-serif;color:#3f6b5e">View your full report →</a></td></tr>
        ${cta}
        <tr><td style="font:11px/1.6 Inter,Helvetica,Arial,sans-serif;color:#7a8a6a;padding-top:28px;border-top:1px solid #dde8c8">${esc(DISCLAIMER)}</td></tr>
      </table>
    </td></tr>
  </table></body></html>`;

  const text = [
    `Hi ${result.name ?? "there"}, here's your FUYL match.`,
    "",
    ...(result.findings ? ["SUMMARY OF YOUR FINDINGS", result.findings.headline, ...result.findings.points.map((p) => `  • ${p.text}`), ""] : []),
    ...result.areas.flatMap((a) => [
      `${a.name} — ${LEVEL[a.level]}`,
      ...a.reasons.map((r) => `  • ${r}`),
      `  COMPLETE+ ingredients: ${a.ingredients.map((i) => i.name + (i.dose ? ` (${i.dose})` : "")).join(", ")}`,
      "",
    ]),
    ...(result.safety.notes.length ? ["Before you start:", ...result.safety.notes.map((n) => `  • ${n.title} — ${n.message}`), ""] : []),
    `Full report: ${resultUrl}`,
    ...(result.showProduct ? [`${productTitle} (from ₹${priceFrom}): ${productUrl}`] : []),
    "",
    DISCLAIMER,
  ].join("\n");

  return { subject, html, text };
}
