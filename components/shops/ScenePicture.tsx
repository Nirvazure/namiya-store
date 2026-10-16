import Image from "next/image";
import { sceneImageStyle, type SceneAsset } from "@/domain/shops";

export function ScenePicture({ scene, alt, className = "" }: { scene: SceneAsset | null; alt: string; className?: string }) {
  return <div className={`shop-scene-picture ${className}`}>{scene ? <Image src={scene.src} alt={alt} fill unoptimized sizes="(max-width: 700px) 85vw, 450px" style={sceneImageStyle(scene)} /> : <span>还没有选择{alt}</span>}</div>;
}
