import Image from "next/image";
import type { CompanionArtwork as Artwork } from "@/domain/companions";

export function CompanionArtwork({ artwork, progress }: { artwork: Artwork; progress: number }) {
  const face = artwork.face;
  return <span className="companion-raster-art">
    <Image className="companion-object-art" src={artwork.src} width={artwork.width} height={artwork.height} alt="" unoptimized draggable={false} />
    {face && <svg className="companion-clock-hands" viewBox={`0 0 ${artwork.width} ${artwork.height}`} aria-hidden="true">
      <path d={`M${face.x} ${face.y}l${-face.radius * .38} ${-face.radius * .28}`} stroke="#6b634d" strokeWidth={face.radius * .075} strokeLinecap="round" />
      <path d={`M${face.x} ${face.y}v${-face.radius * .66}`} transform={`rotate(${progress * 360} ${face.x} ${face.y})`} stroke="#9f6c50" strokeWidth={face.radius * .055} strokeLinecap="round" />
      <circle cx={face.x} cy={face.y} r={face.radius * .075} fill="#776749" />
    </svg>}
  </span>;
}
