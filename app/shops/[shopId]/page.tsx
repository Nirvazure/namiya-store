import { permanentRedirect } from "next/navigation";
import { shopPath } from "@/services/shops/navigation";

export default async function ShopPage({ params, searchParams }: { params: Promise<{ shopId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { shopId } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach(item => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  permanentRedirect(`${shopPath(shopId)}${query.size ? `?${query}` : ""}`);
}
