export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, cache: "no-store", headers: { ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init?.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(data?.error ?? "店里的信号有些弱，请稍后再试。", response.status);
  return data as T;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : "暂时没有连接上，请稍后再试。"; }
