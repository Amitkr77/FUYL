import { connectDB } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness + database readiness. Never leaks connection details. */
export async function GET() {
  let db = false;
  try {
    const m = await connectDB();
    await m.connection.db?.admin().ping();
    db = true;
  } catch {
    db = false;
  }
  return Response.json(
    { ok: db, checks: { db }, time: new Date().toISOString() },
    { status: db ? 200 : 503 },
  );
}
