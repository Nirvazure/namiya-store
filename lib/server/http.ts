import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "HttpError"; }
}
export function fail(status: number, message: string): never { throw new HttpError(status, message); }
export function routeError(error: unknown): Response {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError || error instanceof SyntaxError) return Response.json({ error: "提交的数据格式不正确" }, { status: 400 });
  // Never send database URLs, SQL or upstream credentials back to a browser.
  console.error("Namiya request failed", error instanceof Error ? error.name : "UnknownError");
  return Response.json({ error: "服务暂时不可用，请稍后重试" }, { status: 503 });
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) fail(403, "不允许跨站提交");
  if (request.headers.get("sec-fetch-site") === "cross-site") fail(403, "不允许跨站提交");
}
export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
