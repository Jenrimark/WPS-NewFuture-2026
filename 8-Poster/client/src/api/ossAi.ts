import { apiFetch } from "./client";

export type STSResponse = {
  access_key_id: string;
  access_key_secret: string;
  security_token: string;
  expiration: number;
  region: string;
  bucket: string;
  prefix: string;
  endpoint: string;
};

export async function getOSSSts(): Promise<STSResponse> {
  return apiFetch<STSResponse>("/api/oss/sts");
}

export async function generateAIImage(prompt: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>("/api/ai/generate", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}
