import { apiFetch } from "./client";

export type PosterDTO = {
  id: number;
  user_id: number;
  title: string;
  width: number;
  height: number;
  data: string;
  thumb_url?: string;
  created_at: string;
  updated_at: string;
};

export async function listPosters(): Promise<PosterDTO[]> {
  return apiFetch<PosterDTO[]>("/api/posters");
}

export async function getPoster(id: number): Promise<PosterDTO> {
  return apiFetch<PosterDTO>(`/api/posters/${id}`);
}

export async function createPoster(body: {
  title?: string;
  width?: number;
  height?: number;
  data?: string;
  thumb_url?: string;
}): Promise<PosterDTO> {
  return apiFetch<PosterDTO>("/api/posters", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updatePoster(
  id: number,
  body: {
    title?: string;
    width?: number;
    height?: number;
    data?: string;
    thumb_url?: string;
  },
): Promise<PosterDTO> {
  return apiFetch<PosterDTO>(`/api/posters/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deletePoster(id: number): Promise<void> {
  await apiFetch(`/api/posters/${id}`, { method: "DELETE" });
}
