const TOKEN_KEY = "poster_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export type ApiError = { error: string };

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body && typeof init.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch (e) {
    // 典型：后端未启动、端口不是 8080、或仅用 Docker 却访问了 5173 且无代理
    if (e instanceof TypeError) {
      throw new Error(
        "无法连接后端：请在本机另开终端执行「cd week07/homework/poster/server && go run .」保证 8080 已监听；若用 Docker，请用浏览器打开 http://localhost:8080（不要只开 npm run dev 却访问打包页）。开发时请先 npm run dev 再注册。",
      );
    }
    throw e;
  }
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { error: text };
    }
  } else {
    data = {};
  }

  if (!res.ok) {
    const err = (data as ApiError)?.error ?? res.statusText;
    if (res.status === 401) {
      setToken(null);
    }
    throw new Error(err || "请求失败");
  }
  return data as T;
}
