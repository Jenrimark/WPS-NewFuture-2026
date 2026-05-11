import { Link } from "react-router-dom";
import { PenTool } from "lucide-react";
import { getToken } from "../../api/client";

export function SiteHeader() {
  const authed = !!getToken();

  return (
    <header className="pointer-events-auto mx-4 mt-4 flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/90 px-5 py-3 shadow-lg backdrop-blur-md transition-colors duration-200">
      <Link to="/" className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient-strong">
          <PenTool className="h-5 w-5 text-brand-blue-deep" aria-hidden />
        </span>
        <span className="text-lg tracking-tight">灵犀工坊</span>
      </Link>
      <nav className="flex flex-wrap items-center gap-2">
        {authed ? (
          <Link
            to="/editor"
            className="cursor-pointer rounded-xl bg-brand-blue px-4 py-2 text-sm font-medium text-white shadow transition-colors duration-200 hover:bg-brand-blue-deep"
          >
            进入工作台
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="cursor-pointer rounded-xl px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              登录
            </Link>
            <Link
              to="/register"
              className="cursor-pointer rounded-xl bg-brand-orange px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-brand-orange-deep"
            >
              注册
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
