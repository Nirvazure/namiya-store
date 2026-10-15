// Only names returned by the current-coordinate lookup are used; never infer a city.
export function parsePlaceName(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return;
  const data = value as Record<string, unknown>;
  if (typeof data.lookupSource === "string" && /ip/i.test(data.lookupSource)) return;
  const text = (key: string) => typeof data[key] === "string" ? data[key].trim() : "";
  const city = text("city");
  const locality = text("locality");
  const names = [city || (!locality ? text("principalSubdivision") : ""), locality].filter(Boolean);
  return [...new Set(names)].join(" · ") || undefined;
}
