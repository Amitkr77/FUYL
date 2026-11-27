import path from "node:path";
import { Circle, Document, Font, Line, Page, Polygon, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { AssessmentResult, NutrientRow, ProfileArea } from "@/engine";

/**
 * The downloadable report — a real, paginated A4 PDF generated on the server
 * (no browser print). Mirrors the report page's chapters: summary, focus
 * areas, nutrition, safety & next steps. Informational first; the product is
 * mentioned once, at the end.
 */

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(FONT_DIR, "Inter-400.woff"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Inter-500.woff"), fontWeight: 500 },
    { src: path.join(FONT_DIR, "Inter-600.woff"), fontWeight: 600 },
    { src: path.join(FONT_DIR, "Inter-700.woff"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const C = {
  forest: "#12291f",
  muted: "#4a5a3a",
  teal: "#00897b",
  diet: "#b8741a",
  serve: "#4a5fc1",
  global: "#c45a1c",
  amount: "#3f5148",
  track: "#e6ece0",
  sage: "#dde8c8",
  cream: "#f4f7ef",
  line: "#d9e3cb",
  ember: "#a3481a",
  warnBg: "#fdf3ea",
};

const s = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: C.forest, paddingTop: 44, paddingBottom: 54, paddingHorizontal: 44, lineHeight: 1.45 },
  footer: { position: "absolute", bottom: 22, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted },
  eyebrow: { fontSize: 8, letterSpacing: 1.6, textTransform: "uppercase", color: C.teal, fontWeight: 600 },
  h1: { fontSize: 30, fontWeight: 700, letterSpacing: -0.6, marginTop: 6, lineHeight: 1.15 },
  h2: { fontSize: 17, fontWeight: 700, letterSpacing: -0.3, marginTop: 4, marginBottom: 10 },
  h3: { fontSize: 13, fontWeight: 600 },
  p: { color: C.muted },
  card: { backgroundColor: C.cream, borderRadius: 10, padding: 14, marginBottom: 10 },
  chip: { backgroundColor: C.sage, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 7, fontSize: 8, fontWeight: 500, marginRight: 4 },
  row: { flexDirection: "row" },
  tile: { flex: 1, backgroundColor: "#ffffff", borderRadius: 8, padding: 10, marginRight: 8, borderWidth: 1, borderColor: C.line },
  tileNum: { fontSize: 20, fontWeight: 700, lineHeight: 1.1 },
  tileLabel: { fontSize: 8, color: C.muted, marginTop: 5, lineHeight: 1.3 },
  chapter: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  chapterNo: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.forest, color: "#ffffff", fontSize: 9, fontWeight: 700, textAlign: "center", paddingTop: 4, marginRight: 8 },
});

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { maximumFractionDigits: 1 }));
const LEVEL = { high: "High match", moderate: "Moderate match", mild: "Mild match" } as const;

function Footer({ name }: { name?: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>FUYL wellness report{name ? ` · ${name}` : ""}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function Chapter({ n, title }: { n: number; title: string }) {
  return (
    <View style={s.chapter} minPresenceAhead={80}>
      <Text style={s.chapterNo}>{n}</Text>
      <Text style={{ ...s.h2, marginTop: 0, marginBottom: 0 }}>{title}</Text>
    </View>
  );
}

const SHORT: Record<string, string> = {
  "Skin, Hair & Nails": "Skin & hair",
  "Fitness & Recovery": "Fitness",
  "Healthy Ageing": "Ageing",
  "Liver Support": "Liver",
  "Everyday Nutrient Gaps": "Nutrient gaps",
  "Gut Health": "Gut",
};

function Radar({ profile, size = 230 }: { profile: ProfileArea[]; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 50;
  const n = profile.length;
  const pt = (i: number, v: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: c + Math.cos(a) * (v / 100) * r, y: c + Math.sin(a) * (v / 100) * r, a };
  };
  const ring = (v: number) => profile.map((_, i) => `${pt(i, v).x},${pt(i, v).y}`).join(" ");
  return (
    <Svg width={size} height={size}>
      {[25, 50, 75, 100].map((v) => (
        <Polygon key={v} points={ring(v)} stroke={C.line} strokeWidth={0.7} fill={v === 100 ? "#ffffff" : "none"} />
      ))}
      {profile.map((_, i) => (
        <Line key={i} x1={c} y1={c} x2={pt(i, 100).x} y2={pt(i, 100).y} stroke={C.line} strokeWidth={0.6} />
      ))}
      <Polygon points={profile.map((p, i) => `${pt(i, p.match).x},${pt(i, p.match).y}`).join(" ")} fill={C.teal} fillOpacity={0.18} stroke={C.teal} strokeWidth={1.4} />
      {profile.map((p, i) => (
        <Circle key={p.key} cx={pt(i, p.match).x} cy={pt(i, p.match).y} r={p.shown ? 2.6 : 1.8} fill={p.shown ? C.teal : "#ffffff"} stroke={C.teal} strokeWidth={0.8} />
      ))}
      {profile.map((p, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = c + Math.cos(a) * (r + 10);
        const y = c + Math.sin(a) * (r + 10);
        const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        return (
          <Text key={p.key} x={x} y={y + 2} textAnchor={anchor} style={{ fontSize: 6.5, fill: p.shown ? C.forest : C.muted, fontWeight: p.shown ? 600 : 400 }}>
            {SHORT[p.name] ?? p.name}
          </Text>
        );
      })}
    </Svg>
  );
}

function NutrientRowPdf({ r }: { r: NutrientRow }) {
  const scale = Math.max(r.amount, r.india, r.global) * 1.08;
  const w = (v: number) => `${(v / scale) * 100}%`;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.line }} wrap={false}>
      <View style={{ width: 120 }}>
        <Text style={{ fontSize: 8.5, fontWeight: 500 }}>{r.name.replace(/\s*\(.*\)$/, "")}</Text>
        <Text style={{ fontSize: 7, color: C.muted }}>
          {fmt(r.amount)} {r.unit} per serve
        </Text>
      </View>
      <View style={{ flex: 1, height: 10, marginHorizontal: 8, justifyContent: "center" }}>
        <View style={{ height: 5, backgroundColor: C.track, borderRadius: 3 }} />
        <View style={{ position: "absolute", left: 0, height: 5, width: w(r.amount), backgroundColor: C.amount, borderRadius: 3 }} />
        <View style={{ position: "absolute", left: w(r.india), width: 2, height: 10, backgroundColor: C.teal }} />
        <View style={{ position: "absolute", left: w(r.global), width: 2, height: 10, backgroundColor: C.global }} />
      </View>
      <Text style={{ width: 92, fontSize: 7.5, color: C.muted }}>
        India {fmt(r.india)} {r.unit} · <Text style={{ color: C.forest, fontWeight: 600 }}>{r.indiaPct}%</Text>
      </Text>
      <Text style={{ width: 92, fontSize: 7.5, color: C.muted }}>
        Global {fmt(r.global)} {r.unit} · <Text style={{ color: C.forest, fontWeight: 600 }}>{r.globalPct}%</Text>
      </Text>
    </View>
  );
}

/** Diet gap: meals (estimated) + one serve, stacked, in % of the daily need (marker at 100%). */
function DietRowPdf({ r, global }: { r: NutrientRow; global: boolean }) {
  const need = global ? r.global : r.india;
  const dietPct = need > 0 ? Math.round(((r.diet ?? 0) / need) * 100) : 0;
  const servePct = global ? r.globalPct : r.indiaPct;
  const gap = Math.max(0, 100 - dietPct - servePct);
  const scale = Math.min(200, Math.max(100, dietPct + servePct)) * 1.05;
  const dietW = Math.min(dietPct, scale);
  const serveW = Math.max(0, Math.min(servePct, scale - dietW));
  const w = (v: number) => `${(v / scale) * 100}%`;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.line }} wrap={false}>
      <Text style={{ width: 120, fontSize: 8.5, fontWeight: 500 }}>{r.name.replace(/\s*\(.*\)$/, "")}</Text>
      <View style={{ flex: 1, height: 10, marginHorizontal: 8, justifyContent: "center" }}>
        <View style={{ height: 5, backgroundColor: C.track, borderRadius: 3 }} />
        {dietW > 0 && <View style={{ position: "absolute", left: 0, height: 5, width: w(dietW), backgroundColor: C.diet, borderRadius: 3 }} />}
        {serveW > 0 && <View style={{ position: "absolute", left: w(dietW), height: 5, width: w(serveW), backgroundColor: C.serve, borderRadius: 3, borderLeftWidth: dietW ? 1 : 0, borderLeftColor: "#ffffff" }} />}
        <View style={{ position: "absolute", left: w(100), width: 2, height: 10, backgroundColor: C.teal }} />
      </View>
      <Text style={{ width: 184, fontSize: 7.5, color: C.muted }}>
        Meals ~<Text style={{ color: C.forest, fontWeight: 600 }}>{dietPct}%</Text> · serve <Text style={{ color: C.forest, fontWeight: 600 }}>+{servePct}%</Text> ·{" "}
        {gap ? (
          <>
            gap <Text style={{ color: C.forest, fontWeight: 600 }}>{gap}%</Text>
          </>
        ) : (
          <Text style={{ color: C.forest, fontWeight: 600 }}>covered</Text>
        )}
      </Text>
    </View>
  );
}

export function ReportPdf({
  result,
  createdAt,
  productTitle,
  productUrl,
  disclaimer,
  support,
}: {
  result: AssessmentResult;
  createdAt: Date;
  productTitle: string;
  productUrl: string;
  disclaimer: string;
  support: { email: string; phone: string };
}) {
  const name = result.name;
  const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(createdAt);
  const globalFirst = result.nutrients?.primary === "global";
  const half = result.nutrients?.rows.filter((r) => (globalFirst ? r.globalPct : r.indiaPct) >= 50).length;
  const dietRows = result.nutrients?.dietEstimated ? result.nutrients.rows.filter((r) => r.diet !== undefined) : [];
  const checks = result.safety.notes.filter((n) => n.level === "consult" || n.level === "caution");
  const basis = result.nutrients?.basis === "male" ? "adult men" : result.nutrients?.basis === "female" ? "adult women" : "adults (the higher of men's and women's values)";

  return (
    <Document title={`FUYL wellness report${name ? ` — ${name}` : ""}`} author="FUYL" subject="Personalised wellness assessment" creator="FUYL Assessment">
      {/* ── Cover + Summary ── */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>FUYL · Personalised wellness report</Text>
        <Text style={s.h1}>{name ? `Made for ${name}` : "Your wellness report"}</Text>
        <Text style={{ ...s.p, marginTop: 8 }}>Created {date}</Text>

        <View style={{ ...s.row, marginTop: 18, alignItems: "center" }}>
          {result.profile && result.showProduct && (
            <View style={{ marginRight: 14 }}>
              <Radar profile={result.profile} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.eyebrow}>Summary of your findings</Text>
            <Text style={{ fontSize: 13, fontWeight: 600, marginTop: 6 }}>{result.findings?.headline}</Text>
            {result.showProduct && (
              <View style={{ ...s.row, marginTop: 12 }}>
                <View style={s.tile}>
                  <Text style={s.tileNum}>{result.areas.length}</Text>
                  <Text style={s.tileLabel}>focus areas</Text>
                </View>
                {half !== undefined && (
                  <View style={s.tile}>
                    <Text style={s.tileNum}>
                      {half}/{result.nutrients!.rows.length}
                    </Text>
                    <Text style={s.tileLabel}>nutrients at 50%+ of {globalFirst ? "the global" : "India's"} need</Text>
                  </View>
                )}
                <View style={{ ...s.tile, marginRight: 0 }}>
                  <Text style={{ ...s.tileNum, color: checks.length ? C.ember : C.teal }}>{checks.length ? checks.length : "Clear"}</Text>
                  <Text style={s.tileLabel}>{checks.length ? "to check with a doctor" : "safety check"}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {result.wellness && (
          <View style={{ ...s.card, marginTop: 16, flexDirection: "row", alignItems: "center" }} wrap={false}>
            <View style={{ width: 120, alignItems: "center", marginRight: 16 }}>
              <Text style={{ ...s.eyebrow, textAlign: "center" }}>Wellness score</Text>
              <Text style={{ fontSize: 34, fontWeight: 700, marginTop: 6, lineHeight: 1 }}>{result.wellness.score}</Text>
              <Text style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>out of 100 · {result.wellness.label}</Text>
            </View>
            <View style={{ flex: 1 }}>
              {result.wellness.pillars.map((p) => (
                <View key={p.key} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                  <Text style={{ width: 80, fontSize: 8.5 }}>{p.name}</Text>
                  <View style={{ flex: 1, height: 5, backgroundColor: C.track, borderRadius: 3, marginHorizontal: 6 }}>
                    <View style={{ height: 5, width: `${Math.max(2, p.score)}%`, backgroundColor: C.teal, borderRadius: 3 }} />
                  </View>
                  <Text style={{ width: 20, fontSize: 8.5, fontWeight: 600, textAlign: "right" }}>{p.score}</Text>
                </View>
              ))}
              <Text style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>Higher is better. Based on how you feel and your habits, not a medical test.</Text>
            </View>
          </View>
        )}

        <View style={{ marginTop: 18 }}>
          <Chapter n={1} title="Summary" />
          {(result.findings?.points ?? []).map((p) => (
            <View key={p.text} style={{ ...s.row, marginBottom: 5 }}>
              <Text style={{ color: C.teal, marginRight: 6 }}>•</Text>
              <Text style={{ flex: 1 }}>{p.text}</Text>
            </View>
          ))}
        </View>

        {result.showProduct && result.profile && (
          <View style={{ ...s.card, marginTop: 12 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 600, marginBottom: 4 }}>What &quot;match&quot; means</Text>
            <Text style={{ ...s.p, fontSize: 8.5 }}>
              How strongly your answers point to each area, compared with the strongest possible answers. It is not a health score or a diagnosis.
            </Text>
          </View>
        )}
        <Footer name={name} />
      </Page>

      {/* ── Focus areas ── */}
      {result.areas.length > 0 && (
        <Page size="A4" style={s.page}>
          <Chapter n={2} title="Your focus areas" />
          {result.areas.map((a, i) => (
            <View key={a.key} style={s.card} wrap={false}>
              <View style={{ ...s.row, justifyContent: "space-between", alignItems: "center" }}>
                <Text style={s.h3}>
                  {String(i + 1).padStart(2, "0")} · {a.name}
                </Text>
                <Text style={s.chip}>
                  {LEVEL[a.level]} · {a.match}%
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: C.track, borderRadius: 2, marginTop: 6 }}>
                <View style={{ height: 4, width: `${a.match}%`, backgroundColor: C.teal, borderRadius: 2 }} />
              </View>
              <Text style={{ ...s.p, marginTop: 6 }}>{a.copy}</Text>
              {(a.isPriority || a.reasons.length > 0) && (
                <View style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 8, fontWeight: 600, color: C.teal, marginBottom: 2 }}>WHY THIS MATTERS FOR YOU</Text>
                  {a.isPriority && <Text style={{ fontSize: 9 }}>• You chose this as a priority</Text>}
                  {a.reasons.map((r) => (
                    <Text key={r} style={{ fontSize: 9 }}>
                      • {r}
                    </Text>
                  ))}
                </View>
              )}
              <Text style={{ fontSize: 8, fontWeight: 600, color: C.teal, marginTop: 6, marginBottom: 2 }}>NUTRIENTS THAT SUPPORT THIS</Text>
              <Text style={{ fontSize: 9 }}>{a.ingredients.map((x) => x.name + (x.dose ? ` (${x.dose})` : "")).join(" · ")}</Text>
              {a.tips.length > 0 && (
                <>
                  <Text style={{ fontSize: 8, fontWeight: 600, color: C.teal, marginTop: 6, marginBottom: 2 }}>SIMPLE HABITS THAT HELP</Text>
                  {a.tips.map((t) => (
                    <Text key={t} style={{ fontSize: 9 }}>
                      • {t}
                    </Text>
                  ))}
                </>
              )}
            </View>
          ))}
          <Footer name={name} />
        </Page>
      )}

      {/* ── Nutrition ── */}
      {result.showProduct && result.nutrients && (
        <Page size="A4" style={s.page}>
          <Chapter n={3} title="Your nutrition: one serve vs your daily needs" />
          <Text style={{ ...s.p, marginBottom: 8 }}>
            How much of each daily requirement one 10 g serve provides, in India (ICMR-NIN 2020) and globally (US NIH). Needs shown for {basis}.
          </Text>
          {dietRows.length > 0 && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ ...s.h3, marginBottom: 2 }}>Your meals + one serve</Text>
              <Text style={{ ...s.p, fontSize: 8.5, marginBottom: 6 }}>
                Roughly how much of your daily need ({globalFirst ? "US NIH" : "ICMR-NIN"}) your meals already give, estimated from your answers about a typical week, what one serve
                adds, and any gap left.
              </Text>
              <View style={{ ...s.row, marginBottom: 6, alignItems: "center" }}>
                <View style={{ width: 14, height: 5, backgroundColor: C.diet, borderRadius: 2, marginRight: 4 }} />
                <Text style={{ fontSize: 7.5, color: C.muted, marginRight: 14 }}>Your meals (estimated)</Text>
                <View style={{ width: 14, height: 5, backgroundColor: C.serve, borderRadius: 2, marginRight: 4 }} />
                <Text style={{ fontSize: 7.5, color: C.muted, marginRight: 14 }}>One serve</Text>
                <View style={{ width: 2, height: 9, backgroundColor: C.teal, marginRight: 4 }} />
                <Text style={{ fontSize: 7.5, color: C.muted }}>Your daily need (100%)</Text>
              </View>
              {dietRows.map((r) => (
                <DietRowPdf key={r.key} r={r} global={globalFirst} />
              ))}
            </View>
          )}
          {dietRows.length > 0 && <Text style={{ ...s.h3, marginBottom: 6 }}>One serve vs India and global needs</Text>}
          <View style={{ ...s.row, marginBottom: 6, alignItems: "center" }}>
            <View style={{ width: 14, height: 5, backgroundColor: C.amount, borderRadius: 2, marginRight: 4 }} />
            <Text style={{ fontSize: 7.5, color: C.muted, marginRight: 14 }}>One serve</Text>
            <View style={{ width: 2, height: 9, backgroundColor: C.teal, marginRight: 4 }} />
            <Text style={{ fontSize: 7.5, color: C.muted, marginRight: 14 }}>India daily need (ICMR-NIN 2020)</Text>
            <View style={{ width: 2, height: 9, backgroundColor: C.global, marginRight: 4 }} />
            <Text style={{ fontSize: 7.5, color: C.muted }}>Global daily need (US NIH)</Text>
          </View>
          {result.nutrients.rows.map((r) => (
            <NutrientRowPdf key={r.key} r={r} />
          ))}
          <Text style={{ fontSize: 7.5, color: C.muted, marginTop: 8 }}>
            A supplement adds to what you get from food; it isn&apos;t meant to cover 100% on its own.
            {dietRows.length > 0 && " Meal estimates are rough averages from typical Indian portions (IFCT 2017) and your answers, not a lab measurement."}
          </Text>
          <Footer name={name} />
        </Page>
      )}

      {/* ── Safety & next steps ── */}
      <Page size="A4" style={s.page}>
        <Chapter n={4} title="Safety & next steps" />
        {result.safety.notes.length > 0 ? (
          result.safety.notes.map((n) => (
            <View key={n.key} style={{ ...s.card, backgroundColor: C.warnBg }} wrap={false}>
              <Text style={{ fontWeight: 600 }}>{n.title}</Text>
              <Text style={{ ...s.p, marginTop: 2 }}>{n.message}</Text>
              {n.ingredients.length > 0 && <Text style={{ fontSize: 8, color: C.ember, marginTop: 3 }}>Relevant ingredients: {n.ingredients.join(", ")}</Text>}
            </View>
          ))
        ) : (
          <View style={s.card}>
            <Text>No safety concerns came up in your answers.</Text>
          </View>
        )}

        {result.showProduct && (
          <View style={{ ...s.card, marginTop: 8 }} wrap={false}>
            <Text style={{ fontWeight: 600 }}>If you&apos;d like support</Text>
            <Text style={{ ...s.p, marginTop: 3 }}>
              {productTitle} brings together the nutrients listed in this report in one daily serve. Learn more at {productUrl.replace(/^https?:\/\//, "").split("?")[0]}.
            </Text>
          </View>
        )}

        {result.summary.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ ...s.h3, marginBottom: 4 }}>Your answers</Text>
            {result.summary.map((l) => (
              <Text key={l.questionKey} style={{ fontSize: 8.5, color: C.muted }}>
                • {l.text}
              </Text>
            ))}
          </View>
        )}

        <View style={{ marginTop: 14, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: 8 }}>
          <Text style={{ fontSize: 8, color: C.muted }}>
            Questions? {support.email} · {support.phone}
          </Text>
          <Text style={{ fontSize: 7, color: C.muted, marginTop: 6 }}>
            Sources: ICMR-NIN &quot;Nutrient Requirements for Indians&quot; (2020); US National Institutes of Health RDA/AI (adults 19–50).
          </Text>
          <Text style={{ fontSize: 7, color: C.muted, marginTop: 4 }}>{disclaimer}</Text>
        </View>
        <Footer name={name} />
      </Page>
    </Document>
  );
}
