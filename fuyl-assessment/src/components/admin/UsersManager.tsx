"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createUserAction, updateUserAction } from "@/app/admin/actions";
import { Badge, Card, Field, btn, fmtDate, inputCls } from "./ui";

type U = { id: string; email: string; name: string; role: "admin" | "reviewer"; active: boolean; lastLoginAt?: string };

export function UsersManager({ users, meId }: { users: U[]; meId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ email: "", name: "", role: "reviewer" as U["role"] });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; password?: string }>, success: (p?: string) => string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: success(r.password) } : { ok: false, text: r.error ?? "Failed." });
      router.refresh();
    });

  return (
    <div className="space-y-6">
      {msg && (
        <p className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-sage/60 text-forest" : "bg-[#fde8e4] text-[#a3301e]"}`} role="status">
          {msg.text}
        </p>
      )}
      <Card title="Team">
        <ul className="divide-y divide-line/50">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="text-forest">{u.name}</span> {u.id === meId && <Badge>you</Badge>}
                <span className="block text-xs text-muted">
                  {u.email} · last sign-in {fmtDate(u.lastLoginAt)}
                </span>
              </span>
              <select
                value={u.role}
                disabled={pending || u.id === meId}
                onChange={(e) => run(() => updateUserAction(u.id, { role: e.target.value as U["role"] }), () => `${u.email} is now ${e.target.value}.`)}
                className={`${inputCls} w-auto`}
                aria-label={`Role for ${u.email}`}
              >
                <option value="admin">Admin</option>
                <option value="reviewer">Reviewer</option>
              </select>
              {u.active ? <Badge tone="good">Active</Badge> : <Badge tone="bad">Deactivated</Badge>}
              <button
                type="button"
                disabled={pending || u.id === meId}
                className={btn("secondary", "sm")}
                onClick={() => run(() => updateUserAction(u.id, { active: !u.active }), () => `${u.email} ${u.active ? "deactivated" : "reactivated"}.`)}
              >
                {u.active ? "Deactivate" : "Reactivate"}
              </button>
              <button
                type="button"
                disabled={pending}
                className={btn("ghost", "sm")}
                onClick={() =>
                  confirm(`Reset the password for ${u.email}? They'll be signed out everywhere.`) &&
                  run(() => updateUserAction(u.id, { resetPassword: true }), (p) => `New temporary password for ${u.email}: ${p} — share it securely; it won't be shown again.`)
                }
              >
                Reset password
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Add a user">
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => createUserAction(form),
              (p) => `Created ${form.email}. Temporary password: ${p} — share it securely; it won't be shown again.`,
            );
            setForm({ email: "", name: "", role: "reviewer" });
          }}
        >
          <Field label="Name">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Email">
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Role">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as U["role"] })} className={inputCls}>
              <option value="reviewer">Reviewer</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
          <button disabled={pending} className={btn("primary")}>
            Add user
          </button>
        </form>
      </Card>
    </div>
  );
}
