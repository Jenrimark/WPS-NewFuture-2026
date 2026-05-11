import { Link } from "react-router-dom";
import {
  ArrowRight,
  Layers,
  Palette,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { SiteHeader } from "../components/layout/SiteHeader";

export function HomePage() {
  return (
    <div className="min-h-screen bg-brand-gradient">
      <div className="pointer-events-none fixed inset-0 opacity-[0.08]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40h40V0H0z' fill='none'/%3E%3Cpath d='M20 0v40M0 20h40' stroke='%232563eb' stroke-width='0.5'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-2">
        <SiteHeader />

        <section className="mt-12 rounded-3xl border border-white/60 bg-white/80 px-6 py-14 shadow-xl backdrop-blur-md md:px-14">
          <p className="mb-3 inline-flex rounded-full bg-brand-orange-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-orange-deep">
            灵犀工坊 · Lingxi Studio
          </p>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-ink md:text-5xl">
            用<span className="text-brand-blue">橙蓝碰撞</span>的灵感，做出能被记住的海报
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
            面向课程实战的在线海报设计器：模板思路借鉴行业标杆，交互与工程实现完全可控，适合私有化部署与扩展阿里云 OSS、百炼文生图等能力。
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/register"
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-blue px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-brand-blue-deep"
            >
              免费注册
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <Link
              to="/login"
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-brand-orange bg-white px-6 py-3 text-base font-semibold text-brand-orange-deep transition-colors hover:bg-brand-orange-soft"
            >
              已有账号登录
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Layers,
              title: "三栏专业布局",
              desc: "素材 / 画布 / 属性分区明确，贴合设计工具心智模型。",
            },
            {
              icon: Palette,
              title: "画布级控制",
              desc: "尺寸与背景（纯色 / 贴图）可配，支持导出 PNG。",
            },
            {
              icon: Zap,
              title: "工程向扩展",
              desc: "预留 OSS 直传与百炼文生图接口，便于对接真实业务。",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-white/70 bg-white/85 p-6 shadow-md backdrop-blur transition-transform duration-200 hover:-translate-y-0.5"
            >
              <item.icon className="h-10 w-10 text-brand-blue" aria-hidden />
              <h3 className="mt-4 text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.desc}</p>
            </article>
          ))}
        </section>

        <section className="mt-20 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-lg backdrop-blur md:p-12">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-ink">竞品观察：创客贴</h2>
              <p className="mt-2 max-w-2xl text-ink-muted">
                创客贴是国内成熟的在线设计平台之一。下表用于课程作品的客观对比，突出本项目的学习目标与工程侧重点，而非商业优劣裁决。
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
              <Sparkles className="h-4 w-4 text-brand-orange" aria-hidden />
              对标学习 · 差异化定位
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-brand-blue-soft/60">
                  <th className="px-4 py-3 font-semibold text-slate-800">维度</th>
                  <th className="px-4 py-3 font-semibold text-brand-blue-deep">创客贴（行业参考）</th>
                  <th className="px-4 py-3 font-semibold text-brand-orange-deep">灵犀工坊（本项目）</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                <tr>
                  <td className="px-4 py-4 font-medium text-slate-700">模板与素材生态</td>
                  <td className="px-4 py-4 text-slate-600">海量模板与商用素材矩阵，覆盖营销全场景。</td>
                  <td className="px-4 py-4 text-slate-600">
                    聚焦画布交互与作业功能闭环；素材以示例与上传为主，便于验证工程链路。
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-medium text-slate-700">协作与品牌资产</td>
                  <td className="px-4 py-4 text-slate-600">团队协作、品牌套件与企业服务成熟。</td>
                  <td className="px-4 py-4 text-slate-600">
                    当前以单用户海报编辑与持久化为主，适合课程演示与私有化部署练习。
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-4 font-medium text-slate-700">技术可控性</td>
                  <td className="px-4 py-4 text-slate-600">商业闭源产品，内部架构不外露。</td>
                  <td className="px-4 py-4 text-slate-600">
                    前后端开源实现：Konva 画布、Gin API、SQLite、OSS/AI 接入均可跟踪与扩展。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand-gradient-strong px-6 py-5">
            <div className="flex items-center gap-3">
              <Wand2 className="h-8 w-8 text-brand-blue-deep" aria-hidden />
              <div>
                <p className="font-semibold text-ink">准备好动手了吗？</p>
                <p className="text-sm text-ink-muted">登录后进入工作台，体验完整编辑器。</p>
              </div>
            </div>
            <Link
              to="/editor"
              className="cursor-pointer rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-brand-blue-deep"
            >
              进入灵犀工坊
            </Link>
          </div>
        </section>

        <footer className="mt-16 border-t border-white/40 pt-10 text-center text-sm text-ink-muted">
          <p>灵犀工坊 · 课程实战演示项目 · React + Konva + Gin</p>
        </footer>
      </div>
    </div>
  );
}
