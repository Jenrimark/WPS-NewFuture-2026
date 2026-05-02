import { api, clearToken, getToken, setToken } from "./api";

const root = document.querySelector("#app");

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => node.appendChild(c));
  return node;
}

function button(text, onClick) {
  const b = el("button", { type: "button", class: "btn", text });
  b.addEventListener("click", onClick);
  return b;
}

function input(placeholder, type = "text") {
  return el("input", { placeholder, type, class: "input" });
}

function card(title, bodyChildren) {
  return el("div", { class: "card" }, [
    el("div", { class: "card-title", text: title }),
    el("div", { class: "card-body" }, bodyChildren)
  ]);
}

function setStatus(msg, isErr = false) {
  const node = document.querySelector("#status");
  node.textContent = msg || "";
  node.style.color = isErr ? "#b42318" : "#027a48";
}

function render() {
  root.innerHTML = "";
  const style = el("style", {
    text: `
      :root { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, PingFang SC, Noto Sans SC, Arial; }
      body { margin: 0; background: #f7f7fb; }
      .wrap { max-width: 980px; margin: 0 auto; padding: 20px; }
      .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
      .title { font-size: 18px; font-weight: 700; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .card { background: white; border: 1px solid #e6e6f0; border-radius: 12px; padding: 14px; box-shadow: 0 1px 0 rgba(16,24,40,0.04); }
      .card-title { font-weight: 700; margin-bottom: 10px; }
      .card-body { display: flex; flex-direction: column; gap: 10px; }
      .row { display: flex; gap: 10px; align-items: center; }
      .input, select { width: 100%; padding: 10px 12px; border: 1px solid #d0d5dd; border-radius: 10px; outline: none; }
      .btn { padding: 10px 12px; border-radius: 10px; border: 1px solid #d0d5dd; background: #fff; cursor: pointer; }
      .btn.primary { background: #155eef; color: white; border-color: #155eef; }
      .muted { color: #667085; font-size: 12px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas; }
      .list { display: flex; flex-direction: column; gap: 10px; }
      .item { border: 1px solid #eaecf0; border-radius: 12px; padding: 12px; background: #fcfcff; }
      .item .w { font-weight: 800; font-size: 16px; }
      .item .m { margin-top: 6px; }
      .item ul { margin: 6px 0 0 18px; }
      .pager { display: flex; gap: 10px; align-items: center; justify-content: space-between; }
      .ta { width: 100%; min-height: 52px; padding: 8px 10px; border: 1px solid #d0d5dd; border-radius: 10px; font: inherit; resize: vertical; }
      .stats { font-size: 13px; color: #344054; background: #f9fafb; border-radius: 10px; padding: 10px 12px; border: 1px solid #eaecf0; }
      .nb-toolbar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
      @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    `
  });

  const status = el("div", { id: "status", class: "muted" });

  const top = el("div", { class: "top" }, [
    el("div", { class: "title", text: "单词学习助手（Vite + Nginx 统一入口）" }),
    el("div", { class: "row" }, [
      el("span", { class: "muted mono", text: getToken() ? "已登录" : "未登录" }),
      button("退出", () => {
        clearToken();
        setStatus("已退出");
        render();
      })
    ])
  ]);

  const authCard = card("用户认证", buildAuthUI());
  const queryCard = card("智能查词（不自动保存）", buildQueryUI());
  const notebookCard = card("我的单词本（分页 · 筛选 · 备注 · 统计 · 导出）", buildNotebookUI());

  root.appendChild(style);
  root.appendChild(el("div", { class: "wrap" }, [top, status, el("div", { class: "grid" }, [authCard, queryCard]), notebookCard]));
}

function buildAuthUI() {
  const u = input("用户名（>=3位）");
  const p = input("密码（>=6位）", "password");

  const registerBtn = button("注册", async () => {
    try {
      setStatus("注册中…");
      await api.register({ username: u.value, password: p.value });
      setStatus("注册成功，请登录");
    } catch (e) {
      setStatus(e.message, true);
    }
  });

  const loginBtn = button("登录", async () => {
    try {
      setStatus("登录中…");
      const res = await api.login({ username: u.value, password: p.value });
      setToken(res.token);
      setStatus("登录成功");
      render();
    } catch (e) {
      setStatus(e.message, true);
    }
  });
  loginBtn.classList.add("primary");

  return [
    el("div", { class: "row" }, [u, p]),
    el("div", { class: "row" }, [registerBtn, loginBtn]),
    el("div", { class: "muted", text: "提示：后续请求会自动携带 Authorization: Bearer <token>" })
  ];
}

function buildQueryUI() {
  const word = input("输入单词，如: apple");
  const sel = el("select", {}, [
    el("option", { value: "qwen", text: "阿里云通义千问（DashScope 兼容模式）" }),
    el("option", {
      value: "deepseek",
      text: "备用线路（OpenAI 兼容，需已在 .env 配置可选密钥段）"
    })
  ]);

  const resultBox = el("div", { class: "item", style: "display:none;" });
  let latest = null;

  const queryBtn = button("查询", async () => {
    try {
      if (!getToken()) throw new Error("请先登录");
      setStatus("查询中…");
      const res = await api.queryWord({ word: word.value, ai_provider: sel.value });
      latest = res.data;
      resultBox.style.display = "block";
      resultBox.innerHTML = "";
      resultBox.appendChild(el("div", { class: "w", text: latest.word }));
      resultBox.appendChild(el("div", { class: "m", text: latest.meaning }));
      const ul = el("ul");
      (latest.examples || []).forEach((x) => ul.appendChild(el("li", { text: x })));
      resultBox.appendChild(ul);
      resultBox.appendChild(el("div", { class: "muted", text: `来源：${res.source} / provider=${latest.ai_provider}` }));
      setStatus("查询完成");
    } catch (e) {
      setStatus(e.message, true);
    }
  });
  queryBtn.classList.add("primary");

  const saveNote = el("textarea", {
    class: "ta",
    placeholder: "可选：保存时写入学习备注（如易混点、发音提示）",
    rows: "2"
  });

  const saveBtn = button("保存到单词本", async () => {
    try {
      if (!latest) throw new Error("请先查询到结果");
      setStatus("保存中…");
      await api.saveWord({
        word: latest.word,
        meaning: latest.meaning,
        examples: latest.examples,
        ai_provider: latest.ai_provider,
        note: saveNote.value.trim()
      });
      setStatus("保存成功");
      saveNote.value = "";
      window.__reloadNotebook?.();
    } catch (e) {
      setStatus(e.message, true);
    }
  });

  return [
    el("div", { class: "row" }, [word, sel]),
    el("div", { class: "row" }, [queryBtn, saveBtn]),
    saveNote,
    resultBox
  ];
}

function buildNotebookUI() {
  const list = el("div", { class: "list" });
  const pageSize = 5;
  let page = 1;
  let total = 0;
  let filterQ = "";

  const filterInput = input("按单词包含文字筛选，如 apple");
  const filterBtn = button("应用筛选", async () => {
    filterQ = filterInput.value.trim();
    page = 1;
    await load();
  });
  filterBtn.classList.add("primary");

  const exportBtn = button("导出 CSV", async () => {
    try {
      if (!getToken()) throw new Error("请先登录");
      setStatus("导出中…");
      await api.exportWordbook();
      setStatus("已下载 wordbook.csv");
    } catch (e) {
      setStatus(e.message, true);
    }
  });

  const statsBox = el("div", { class: "stats", id: "statsBox", text: "统计加载中…" });

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
        list.innerHTML = `<div class="muted">请先登录后查看你的单词本。</div>`;
        statsBox.textContent = "登录后显示学习统计。";
        return;
      }
      setStatus("加载单词本…");
      const res = await api.listWords({ page, page_size: pageSize, q: filterQ });
      total = res.total;

      list.innerHTML = "";
      if (!res.items?.length) {
        list.appendChild(el("div", { class: "muted", text: "暂无记录，调整筛选或去上方查词并保存。" }));
      } else {
        res.items.forEach((it) => {
          const box = el("div", { class: "item" });
          box.appendChild(el("div", { class: "w", text: it.word }));
          box.appendChild(el("div", { class: "m", text: it.meaning }));
          const ul = el("ul");
          (it.examples || []).forEach((x) => ul.appendChild(el("li", { text: x })));
          box.appendChild(ul);
          const noteTa = el("textarea", { class: "ta", rows: "2", placeholder: "编辑学习备注…" });
          noteTa.value = it.notes || "";
          box.appendChild(noteTa);
          box.appendChild(
            el("div", { class: "row" }, [
              el("div", { class: "muted", text: `provider=${it.ai_provider}` }),
              button("保存备注", async () => {
                try {
                  setStatus("保存备注…");
                  await api.updateWordNote(it.id, noteTa.value.trim());
                  setStatus("备注已保存");
                  await load();
                  await refreshStats();
                } catch (e) {
                  setStatus(e.message, true);
                }
              }),
              button("删除", async () => {
                try {
                  setStatus("删除中…");
                  await api.deleteWord(it.id);
                  setStatus("删除成功");
                  await load();
                  await refreshStats();
                } catch (e) {
                  setStatus(e.message, true);
                }
              })
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
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    pager.innerHTML = "";
    pager.appendChild(
      el("div", { class: "muted", text: `第 ${page} / ${totalPages} 页，共 ${total} 条` })
    );
    const controls = el("div", { class: "row" });
    const prev = button("上一页", async () => {
      page = Math.max(1, page - 1);
      await load();
    });
    const next = button("下一页", async () => {
      page = Math.min(totalPages, page + 1);
      await load();
    });
    controls.appendChild(prev);
    controls.appendChild(next);
    pager.appendChild(controls);
  }

  window.__reloadNotebook = load;

  const toolbar = el("div", { class: "nb-toolbar" }, [
    statsBox,
    el("div", { class: "row" }, [filterInput, filterBtn, exportBtn])
  ]);

  const wrapper = el("div", {}, [toolbar, el("div", { id: "pager", class: "pager" }), list]);

  setTimeout(load, 0);
  return [wrapper];
}

render();

