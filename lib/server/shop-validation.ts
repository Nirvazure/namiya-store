import { z } from "zod";
import { systemShops, type SceneAsset } from "@/domain/shops";

const frame = z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), scale: z.number().min(1).max(2) });
const scene = z.object({ mode: z.enum(["image", "layers"]), src: z.string().max(2048), templateId: z.enum(["grandpa", "sashimi", "dessert", "matcha"]).optional(), uploadId: z.string().max(128).optional(), framing: frame });
export const draftSchema = z.object({
  name: z.string().trim().max(30), description: z.string().trim().max(240),
  signStyle: z.enum(["wood", "paper", "moss"]), musicTrackId: z.enum(["rain-radio", "store-lamp"]), acceptingLetters: z.boolean(),
  scenes: z.object({ outdoor: scene.nullable(), indoor: scene.nullable() }),
});

// Templates are an allowlist, never accept a caller-supplied fetch URL or path.
export function canonicalTemplate(asset: SceneAsset, side: "outdoor" | "indoor"): SceneAsset | null {
  const template = systemShops.find(shop => shop.id === asset.templateId)?.scenes[side];
  if (!template || asset.uploadId) return null;
  return { ...template, framing: asset.framing };
}
