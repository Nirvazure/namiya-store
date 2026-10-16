import type { Shop } from "@/domain/shops";

export type SceneLocation = { latitude: number; longitude: number; placeName?: string; timezone?: string };

// City coordinates published by Bungotakada: 33°33′N, 131°26′E.
// https://www.city.bungotakada.oita.jp/soshiki/4/1801.html
export const officialShopLocation: SceneLocation = {
  latitude: 33.55,
  longitude: 131.433333,
  placeName: "日本大分县丰后高田市",
  timezone: "Asia/Tokyo",
};

export function fixedShopLocation(shop: Pick<Shop, "id" | "kind">): SceneLocation | undefined {
  return shop.id === "grandpa" && shop.kind === "system" ? officialShopLocation : undefined;
}
