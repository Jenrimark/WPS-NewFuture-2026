import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  collectFontCategories,
  ensureFontFaceLoaded,
  loadFontLibraryManifest,
  resolveCssFamily,
  type FontLibraryEntry,
  type FontLibraryManifest,
} from "../../lib/fontLibrary";

type Props = {
  currentFamily: string;
  onPick: (cssFamily: string) => void;
  pushHistory: () => void;
};

export function FontLibraryPicker({ currentFamily, onPick, pushHistory }: Props) {
  const [manifest, setManifest] = useState<FontLibraryManifest | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("全部");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadErr(null);
    void (async () => {
      const m = await loadFontLibraryManifest();
      if (cancelled) return;
      if (!m) {
        setManifest(null);
        setLoadErr("无法加载 manifest.json（检查 VITE_FONT_LIBRARY_BASE_URL 与 OSS CORS）");
      } else {
        setManifest(m);
        setLoadErr(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    if (!manifest?.fonts.length) return ["全部"];
    return ["全部", ...collectFontCategories(manifest.fonts)];
  }, [manifest]);

  const filtered = useMemo(() => {
    if (!manifest?.fonts.length) return [];
    const qq = q.trim().toLowerCase();
    return manifest.fonts.filter((f) => {
      if (cat !== "全部" && (f.category?.trim() || "未分类") !== cat) return false;
      if (!qq) return true;
      const label = f.label.toLowerCase();
      const id = f.id.toLowerCase();
      return label.includes(qq) || id.includes(qq);
    });
  }, [manifest, q, cat]);

  const apply = useCallback(
    async (entry: FontLibraryEntry) => {
      setBusyId(entry.id);
      try {
        const family = await ensureFontFaceLoaded(entry);
        pushHistory();
        onPick(family);
      } catch {
        setLoadErr("加载字体文件失败（检查 OSS 路径、跨域与文件是否存在）");
      } finally {
        setBusyId(null);
      }
    },
    [onPick, pushHistory],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        正在加载字体清单…
      </div>
    );
  }

  if (loadErr && !manifest?.fonts.length) {
    return <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">{loadErr}</p>;
  }

  if (!manifest?.fonts.length) {
    return (
      <p className="text-xs leading-relaxed text-slate-500">
        字体库清单为空。请在 OSS{" "}
        <code className="rounded bg-slate-100 px-1">font-library/manifest.json</code>{" "}
        中配置 <code className="rounded bg-slate-100 px-1">fonts</code> 数组。
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-2">
      <div className="text-xs font-medium text-slate-600">字体库（OSS）</div>
      {loadErr ? <p className="text-xs text-amber-800">{loadErr}</p> : null}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="搜索名称…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-xs outline-none ring-brand-blue focus:ring-1"
        />
      </div>
      <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`rounded-md px-2 py-0.5 text-[11px] transition-colors ${
              cat === c
                ? "bg-brand-blue text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="max-h-36 space-y-0.5 overflow-y-auto rounded-md border border-slate-200 bg-white p-1">
        {filtered.length === 0 ? (
          <li className="px-2 py-2 text-center text-xs text-slate-500">无匹配字体</li>
        ) : (
          filtered.map((entry) => {
            const fam = resolveCssFamily(entry);
            const active = currentFamily === fam;
            const busy = busyId === entry.id;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void apply(entry)}
                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                    active ? "bg-brand-blue-soft font-medium text-brand-blue-deep" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="min-w-0 truncate">{entry.label}</span>
                  {busy ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-500" /> : null}
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
