import type { CounterId } from "@/domain/indoor";

export type SignStyle = "wood" | "paper" | "moss";
export type SceneAsset = {
  mode: "image" | "layers";
  src: string;
  templateId?: CounterId;
  uploadId?: string;
  framing: { x: number; y: number; scale: number };
};
export type ScenePair = { outdoor: SceneAsset; indoor: SceneAsset };
export type Shop = {
  id: string;
  kind: "system" | "demo" | "human";
  name: string;
  description: string;
  signStyle: SignStyle;
  musicTrackId: string;
  acceptingLetters: boolean;
  isOpen: boolean;
  discoverable: boolean;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
  isFavorite?: boolean;
  scenes: ScenePair;
  isOwner?: boolean;
  appearance?: { showForegroundPlants: boolean };
};
export type ShopDraft = {
  name: string;
  description: string;
  signStyle: SignStyle;
  musicTrackId: string;
  acceptingLetters: boolean;
  scenes: { outdoor: SceneAsset | null; indoor: SceneAsset | null };
  appearance?: { showForegroundPlants: boolean };
};
export type MyShopResponse = { shop: Shop | null; draft: ShopDraft | null };
export type CurrentUser = { id: string; displayName: string; avatarUrl?: string | null };
export type SessionResponse = { user: CurrentUser | null; configured: boolean; myShopId: string | null; initializationError?: string };
export type ShopPageResponse = { shops: Shop[]; nextCursor: string | null };

const framing = { x: 50, y: 50, scale: 1 };
const exteriorFiles = [
  "/outdoor/微信图片_20261015224308_1_5.jpg",
  "/outdoor/微信图片_20261015224309_2_5.jpg",
  "/outdoor/微信图片_20261015224310_3_5.jpg",
];
export const systemShops: Shop[] = [
  { id: "grandpa", kind: "system", name: "解忧杂货店", description: "心事有处落笔，爷爷会慢慢读。", signStyle: "wood", musicTrackId: "rain-radio", acceptingLetters: true, isOpen: true, discoverable: false, ownerDisplayName: "浪矢爷爷", ownerAvatarUrl: null,
    scenes: { outdoor: { mode: "layers", src: "/joy_store_parallax/optimized/building.webp", templateId: "grandpa", framing }, indoor: { mode: "layers", src: "/indoor/previews/grandpa.png", templateId: "grandpa", framing } } },
  ...(["sashimi", "dessert", "matcha"] as CounterId[]).map((id, index): Shop => ({
    id, kind: "demo", name: ["喵猫刺身", "兔子的甜品屋", "一盏抹茶"][index],
    description: ["今天也有新鲜的海风。", "给今天留一点甜。", "捧一杯温热，让脚步慢下来。"][index],
    signStyle: "paper", musicTrackId: "store-lamp", acceptingLetters: false, isOpen: true, discoverable: false, ownerDisplayName: ["猫店长", "兔店长", "抹茶店长"][index], ownerAvatarUrl: null,
    scenes: { outdoor: { mode: "image", src: exteriorFiles[index], templateId: id, framing }, indoor: { mode: "layers", src: `/indoor/previews/${id}.png`, templateId: id, framing } },
  })),
];
export const defaultShop = systemShops[0];
export function getSystemShop(id: string) { return systemShops.find(shop => shop.id === id); }
export function sceneImageStyle(scene: SceneAsset) {
  return { objectPosition: `${scene.framing.x}% ${scene.framing.y}%`, transformOrigin: `${scene.framing.x}% ${scene.framing.y}%`, transform: `scale(${scene.framing.scale})` };
}
