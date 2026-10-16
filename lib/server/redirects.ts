export function safeReturnPath(candidate: string | null, origin: string): string {
  if (!candidate?.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) return "/";
  try {
    const resolved = new URL(candidate, origin);
    if (resolved.origin !== origin) return "/";
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch { return "/"; }
}
