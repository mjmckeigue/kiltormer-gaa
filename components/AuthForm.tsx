"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "forgot" | "reset";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const supabase = createClient();
    const origin = window.location.origin;
    setBusy(true); setMsg(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/"); router.refresh();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: String(f.get("full_name")).trim() }, emailRedirectTo: `${origin}/auth/callback` },
        });
        if (error) throw error;
        setMsg({ ok: true, text: "Check your email to confirm your address. A club admin will then approve your account." });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/callback?next=/auth/reset` });
        if (error) throw error;
        setMsg({ ok: true, text: "If that email is registered, a reset link is on its way." });
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        router.replace("/"); router.refresh();
      }
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const cta = { login: "Log in", signup: "Create account", forgot: "Send reset link", reset: "Save password" }[mode];
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {mode === "signup" && (
        <div><label className="label">Full name</label><input name="full_name" required className="input" autoComplete="name" /></div>
      )}
      {mode !== "reset" && (
        <div><label className="label">Email</label><input name="email" type="email" required className="input" autoComplete="email" /></div>
      )}
      {mode !== "forgot" && (
        <div>
          <label className="label">{mode === "reset" ? "New password" : "Password"}</label>
          <input name="password" type="password" required minLength={8} className="input"
            autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>
      )}
      {msg && <p className={`rounded-lg p-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Please wait…" : cta}</button>
      <div className="flex justify-between pt-1 text-sm">
        {mode === "login" ? (
          <>
            <Link href="/signup" className="font-semibold text-club">Create an account</Link>
            <Link href="/forgot" className="text-slate-500">Forgot password?</Link>
          </>
        ) : mode !== "reset" ? (
          <Link href="/login" className="font-semibold text-club">Back to log in</Link>
        ) : null}
      </div>
    </form>
  );
}
