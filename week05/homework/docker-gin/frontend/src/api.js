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

export const api = {
  register: (payload) => request("/api/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/login", { method: "POST", body: payload }),
  queryWord: ({ word, ai_provider }) =>
    request(`/api/words/query?word=${encodeURIComponent(word)}&ai_provider=${encodeURIComponent(ai_provider)}`),
  saveWord: (payload) => request("/api/words", { method: "POST", body: payload }),
  listWords: ({ page, page_size }) =>
    request(`/api/words?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(page_size)}`),
  deleteWord: (id) => request(`/api/words/${encodeURIComponent(id)}`, { method: "DELETE" })
};

