import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { PenTool } from "lucide-react";
import { login } from "../api/auth";

export function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? "/editor";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(username, password);
      nav(from, { replace: true });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "登录失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-brand-gradient px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="mb-8 flex cursor-pointer items-center justify-center gap-2 text-lg font-semibold text-ink"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow">
            <PenTool className="h-6 w-6 text-brand-blue" aria-hidden />
          </span>
          灵犀工坊
        </Link>

        <div className="rounded-3xl border border-white/60 bg-white/90 p-8 shadow-xl backdrop-blur">
          <h1 className="text-center text-2xl font-bold text-ink">登录</h1>
          <p className="mt-2 text-center text-sm text-ink-muted">欢迎回到工作台</p>

          <form className="mt-8 space-y-4" onSubmit={(e) => void submit(e)}>
            <label className="block text-sm font-medium text-slate-700">
              用户名
              <input
                required
                minLength={3}
                autoComplete="username"
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none ring-brand-blue focus:ring-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              密码
              <input
                required
                minLength={6}
                type="password"
                autoComplete="current-password"
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 outline-none ring-brand-blue focus:ring-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {err ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {err}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full cursor-pointer rounded-xl bg-brand-blue py-3 font-semibold text-white shadow transition-colors hover:bg-brand-blue-deep disabled:opacity-60"
            >
              {busy ? "登录中…" : "登录"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            没有账号？
            <Link to="/register" className="ml-1 font-medium text-brand-blue hover:underline">
              注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
