import { apiFetch, setToken } from "./client";

export type User = { id: number; username: string };

export type AuthResponse = {
  token: string;
  user: User;
};

export async function login(username: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export function logout(): void {
  setToken(null);
}
