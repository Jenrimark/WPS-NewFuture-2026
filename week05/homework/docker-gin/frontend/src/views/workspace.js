import { api, clearToken, getToken } from "../api.js";
import { navigate } from "../router.js";
import { button, card, el, input } from "../dom.js";

function setStatus(msg, isErr = false) {
  const node = document.querySelector("#status");
  if (!node) return;
  node.textContent = msg || "";
  node.classList.toggle("status--error", Boolean(isErr));
  node.classList.toggle("status--ok", Boolean(msg) && !isErr);
}

function buildQueryUI() {
  const word = input("输入单词，例如 apple");
  const sel = el("select", { class: "select" }, [
    el("option", { value: "qwen", text: "阿里云通义千问（DashScope 兼容）" }),
    el("option", { value: "deepseek", text: "备用线路（OpenAI 兼容）" })
  ]);

  const resultBox = el("div", { class: "result-box", style: "display:none;" });
  let latest = null;

  const queryBtn = button(
    "查询",
    async () => {
      try {
        if (!getToken()) throw new Error("请先登录");
        setStatus("查询中…");
        const res = await api.queryWord({ word: word.value, ai_provider: sel.value });
        latest = res.data;
        resultBox.style.display = "block";
        resultBox.innerHTML = "";
        resultBox.appendChild(el("div", { class: "result-word", text: latest.word }));
        resultBox.appendChild(el("div", { class: "result-meaning", text: latest.meaning }));
        const ul = el("ul", { class: "examples" });
        (latest.examples || []).forEach((x) => ul.appendChild(el("li", { text: x })));
        resultBox.appendChild(ul);
        resultBox.appendChild(
          el("div", {
            class: "muted small",
            text: `来源：${res.source} · provider=${latest.ai_provider}`
          })
        );
        setStatus("查询完成");
      } catch (e) {
        setStatus(e.message, true);
      }
    },
    "primary"
  );

  const saveBtn = button(
    "保存到单词本",
    async () => {
      try {
        if (!latest) throw new Error("请先查询到结果");
        setStatus("保存中…");
        await api.saveWord({
          word: latest.word,
          meaning: latest.meaning,
          examples: latest.examples,
          ai_provider: latest.ai_provider
        });
        setStatus("保存成功");
        window.__reloadNotebook?.();
      } catch (e) {
        setStatus(e.message, true);
      }
    },
    "btn"
  );

  return [
    el("div", { class: "field-row" }, [
      el("div", { class: "grow" }, [word]),
      el("div", { class: "provider-wrap" }, [sel])
    ]),
    el("div", { class: "btn-row" }, [queryBtn, saveBtn]),
    resultBox
  ];
}

function buildNotebookUI() {
  const list = el("div", { class: "list" });
  const pageSize = 5;
  let page = 1;
  let total = 0;
  let filterQ = "";

  const filterInput = input("按单词关键字筛选");
  const filterBtn = button(
    "应用筛选",
    async () => {
      filterQ = filterInput.value.trim();
      page = 1;
      await load();
    },
    "primary"
  );

  const exportBtn = button(
    "导出 CSV",
    async () => {
      try {
        if (!getToken()) throw new Error("请先登录");
        setStatus("导出中…");
        await api.exportWordbook();
        setStatus("已下载 wordbook.csv");
      } catch (e) {
        setStatus(e.message, true);
      }
    },
    "btn"
  );

  const statsBox = el("div", { class: "stats-banner", id: "statsBox", text: "统计加载中…" });

  async function refreshStats() {
    const node = document.querySelector("#statsBox");
    if (!node || !getToken()) {
      if (node) node.textContent = "登录后显示学习统计。";
      return;
    }
    try {
      const s = await api.statsSummary();
      const parts = Object.entries(s.by_ai_provider || {}).map(([k, v]) => `${k}: ${v}`);
      node.textContent = `词本共 ${s.total_words} 条；近 7 日新增 ${s.words_last_7_days} 条。按模型：${parts.join("，") || "—"}`;
    } catch {
      node.textContent = "统计暂时不可用。";
    }
  }

  async function load() {
    try {
      if (!getToken()) {
        list.innerHTML = "";
        list.appendChild(el("div", { class: "muted", text: "请先登录后查看单词本。" }));
        statsBox.textContent = "登录后显示学习统计。";
        return;
      }
      setStatus("加载单词本…");
      const res = await api.listWords({ page, page_size: pageSize, q: filterQ });
      total = res.total;

      list.innerHTML = "";
      if (!res.items?.length) {
        list.appendChild(
          el("div", { class: "empty-hint muted", text: "暂无记录，可先查词并保存。" })
        );
      } else {
        res.items.forEach((it) => {
          const box = el("div", { class: "word-item" });
          box.appendChild(el("div", { class: "word-item-title", text: it.word }));
          box.appendChild(el("div", { class: "word-item-meaning", text: it.meaning }));
          const ul = el("ul", { class: "examples" });
          (it.examples || []).forEach((x) => ul.appendChild(el("li", { text: x })));
          box.appendChild(ul);
          box.appendChild(
            el("div", { class: "word-item-actions" }, [
              el("span", { class: "muted small", text: `provider=${it.ai_provider}` }),
              button(
                "删除",
                async () => {
                  try {
                    setStatus("删除中…");
                    await api.deleteWord(it.id);
                    setStatus("删除成功");
                    await load();
                    await refreshStats();
                  } catch (e) {
                    setStatus(e.message, true);
                  }
                },
                "btn btn-sm btn-danger-outline"
              )
            ])
          );
          list.appendChild(box);
        });
      }

      setStatus("加载完成");
      renderPager();
      await refreshStats();
    } catch (e) {
      setStatus(e.message, true);
    }
  }

  function renderPager() {
    const pager = document.querySelector("#pager");
    if (!pager) return;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    pager.innerHTML = "";
    pager.appendChild(
      el("div", { class: "muted small", text: `第 ${page} / ${totalPages} 页 · 共 ${total} 条` })
    );
    const controls = el("div", { class: "pager-btns" });
    controls.appendChild(
      button(
        "上一页",
        async () => {
          page = Math.max(1, page - 1);
          await load();
        },
        "btn btn-sm"
      )
    );
    controls.appendChild(
      button(
        "下一页",
        async () => {
          page = Math.min(totalPages, page + 1);
          await load();
        },
        "btn btn-sm"
      )
    );
    pager.appendChild(controls);
  }

  window.__reloadNotebook = load;

  const toolbar = el("div", { class: "nb-toolbar" }, [
    statsBox,
    el("div", { class: "toolbar-row" }, [filterInput, filterBtn, exportBtn])
  ]);

  const wrapper = el("div", {}, [toolbar, el("div", { id: "pager", class: "pager" }), list]);

  setTimeout(load, 0);
  return [wrapper];
}

export function renderWorkspace(root) {
  root.innerHTML = "";

  const header = el("header", { class: "app-header" }, [
    el("div", { class: "app-brand" }, [
      el("span", { class: "app-logo", text: "📚" }),
      el("div", {}, [
        el("div", { class: "app-name", text: "单词学习助手" }),
        el("div", { class: "muted small", text: "智能查词 · 个人词本" })
      ])
    ]),
    el("div", { class: "header-actions" }, [
      el("span", { class: "pill", text: getToken() ? "已登录" : "未登录" }),
      button(
        "退出登录",
        () => {
          clearToken();
          setStatus("已退出");
          navigate("/login", { replace: true });
        },
        "btn btn-ghost"
      )
    ])
  ]);

  const status = el("div", { id: "status", class: "status workspace-status muted" });

  const main = el("main", { class: "app-main" }, [
    status,
    el("div", { class: "workspace-grid" }, [
      card("智能查词（查询结果不会自动入库）", buildQueryUI(), "card card-span"),
      card("我的单词本（分页 · 筛选 · 统计 · 导出）", buildNotebookUI(), "card card-span")
    ])
  ]);

  root.appendChild(el("div", { class: "app-shell" }, [header, main]));
}
