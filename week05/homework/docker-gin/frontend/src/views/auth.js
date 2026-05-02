import { api, setToken } from "../api.js";
import { navigate } from "../router.js";
import { el, input } from "../dom.js";

function setStatus(msg, isErr = false) {
  const node = document.querySelector("#status");
  if (!node) return;
  node.textContent = msg || "";
  node.classList.toggle("status--error", Boolean(isErr));
  node.classList.toggle("status--ok", Boolean(msg) && !isErr);
}

export function renderAuth(root) {
  root.innerHTML = "";

  const shell = el("div", { class: "auth-shell" }, [
    el("div", { class: "auth-bg" }),
    el("div", { class: "auth-panel" }, [
      el("div", { class: "auth-brand" }, [
        el("div", { class: "auth-logo", text: "📚" }),
        el("h1", { class: "auth-title", text: "单词学习助手" }),
        el("p", { class: "auth-sub", text: "登录或注册后开始查词与积累个人词本" })
      ]),
      el("div", { class: "auth-card" }, [
        el("div", { class: "tabs", role: "tablist" }, []),
        el("div", { id: "status", class: "status muted" }),
        el("div", { class: "auth-fields" }, []),
        el("p", { class: "auth-hint muted", text: "登录后请求将自动携带 Bearer Token" })
      ]),
      el("footer", { class: "auth-footer muted", text: "Vite · Gin · Docker 统一入口" })
    ])
  ]);

  const tabsRow = shell.querySelector(".tabs");
  const fields = shell.querySelector(".auth-fields");

  const u = input("用户名（至少 3 位）");
  const p = input("密码（至少 6 位）", "password");
  u.autocomplete = "username";
  p.autocomplete = "current-password";

  let mode = "login";

  const submitBtn = el("button", { type: "button", class: "btn primary btn-block", text: "登录" });
  submitBtn.addEventListener("click", async () => {
    try {
      setStatus(mode === "login" ? "登录中…" : "注册中…");
      if (mode === "register") {
        await api.register({ username: u.value, password: p.value });
        setStatus("注册成功，请登录");
        mode = "login";
        applyMode();
        return;
      }
      const res = await api.login({ username: u.value, password: p.value });
      setToken(res.token);
      setStatus("登录成功");
      navigate("/app", { replace: true });
    } catch (e) {
      setStatus(e.message, true);
    }
  });

  function applyMode() {
    tabsRow.innerHTML = "";
    const mkTab = (id, label) => {
      const tab = el("button", {
        type: "button",
        class: `tab ${mode === id ? "tab--active" : ""}`,
        text: label,
        role: "tab",
        "aria-selected": mode === id ? "true" : "false"
      });
      tab.addEventListener("click", () => {
        mode = id;
        setStatus("");
        applyMode();
      });
      tabsRow.appendChild(tab);
    };
    mkTab("login", "登录");
    mkTab("register", "注册");

    submitBtn.textContent = mode === "login" ? "登录" : "注册";

    fields.innerHTML = "";
    fields.appendChild(el("label", { class: "field-label", text: "用户名" }));
    fields.appendChild(u);
    fields.appendChild(el("label", { class: "field-label", text: "密码" }));
    fields.appendChild(p);
    fields.appendChild(submitBtn);
  }

  applyMode();
  root.appendChild(shell);
}
