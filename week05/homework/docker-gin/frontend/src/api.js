export function getToken() {
  return localStorage.getItem("token") || "";
}

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || data?.code || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/** 下载词本 CSV（非 JSON，不走 request 解析） */
export async function exportWordbook() {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch("/api/words/export", { method: "GET", headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "wordbook.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  register: (payload) => request("/api/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/login", { method: "POST", body: payload }),
  queryWord: ({ word, ai_provider }) =>
    request(`/api/words/query?word=${encodeURIComponent(word)}&ai_provider=${encodeURIComponent(ai_provider)}`),
  saveWord: (payload) => request("/api/words", { method: "POST", body: payload }),
  listWords: ({ page, page_size, q }) => {
    const qs = new URLSearchParams({
      page: String(page),
      page_size: String(page_size)
    });
    if (q && String(q).trim()) qs.set("q", String(q).trim());
    return request(`/api/words?${qs.toString()}`);
  },
  deleteWord: (id) => request(`/api/words/${encodeURIComponent(id)}`, { method: "DELETE" }),
  statsSummary: () => request("/api/stats/summary"),
  exportWordbook
};
