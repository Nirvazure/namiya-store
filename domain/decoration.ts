import { systemShops, type Shop, type SignStyle } from "@/domain/shops";

export type DecorationThemeId = "sashimi" | "dessert" | "matcha";
export const decorationThemes = systemShops.filter(shop => shop.kind === "demo");
export type DecorationSettings = {
  name: string;
  description: string;
  signStyle: SignStyle;
  musicTrackId: string;
  showForegroundPlants: boolean;
  themeId?: DecorationThemeId;
};
export type DecorationResponse = { shop: Shop; revision: number; onboardedAt: string | null };
export function decorationSettings(shop: Shop): DecorationSettings {
  return { name: shop.name, description: shop.description, signStyle: shop.signStyle, musicTrackId: shop.musicTrackId,
    showForegroundPlants: shop.appearance?.showForegroundPlants ?? true };
}
export function decorationPreview(shop: Shop, settings: DecorationSettings): Shop {
  const theme = decorationThemes.find(item => item.id === settings.themeId);
  return { ...shop, name: settings.name, description: settings.description, signStyle: settings.signStyle, musicTrackId: settings.musicTrackId,
    appearance: { showForegroundPlants: settings.showForegroundPlants },
    scenes: { ...shop.scenes, indoor: theme?.scenes.indoor ?? shop.scenes.indoor } };
}
