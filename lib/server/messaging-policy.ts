/** Pure policy helpers shared by the database service and its security tests. */
export function participantRole(thread: { visitorId: string; shopOwnerId: string | null }, userId: string) {
  if (thread.visitorId === userId) return "visitor" as const;
  if (thread.shopOwnerId === userId) return "owner" as const;
  return null;
}
export function textField(value: unknown, maximum: number, required = true) {
  if (typeof value !== "string") throw new Error("请填写有效的文字。");
  const text = value.trim();
  if ((required && !text) || text.length > maximum) throw new Error(`文字长度须在${required ? 1 : 0}至${maximum}字之间。`);
  return text;
}
export function requestId(value: unknown) {
  if (typeof value !== "string" || !/^[\w-]{8,100}$/.test(value)) throw new Error("请提供有效的请求标识。");
  return value;
}
export function extractResponseText(value: unknown): string {
  if (!value || typeof value !== "object") throw new Error("AI 没有返回有效回信。");
  const data = value as { status?: string; output?: unknown; output_text?: unknown };
  if (data.status && data.status !== "completed") throw new Error("AI 回信尚未完成，请重试。");
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  if (!Array.isArray(data.output)) throw new Error("AI 没有返回有效回信。");
  const text = data.output.flatMap((item: { type?: string; content?: { type?: string; text?: string }[] }) =>
    item.type === "message" && Array.isArray(item.content)
      ? item.content.filter(part => part.type === "output_text" && typeof part.text === "string").map(part => part.text)
      : [],
  ).join("\n").trim();
  if (!text) throw new Error("AI 没有返回有效回信。");
  return text;
}
