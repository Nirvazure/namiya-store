"use client";

import { ArrowRight, EnvelopeSimple } from "@phosphor-icons/react";
import type { Shop } from "@/domain/shops";
import { ScenePicture } from "./ScenePicture";
import { ShopDialog } from "./ShopDialog";

export function ShopDirectory({ shops, onVisit, onClose }: { shops: Shop[]; onVisit: (shop: Shop) => void; onClose: () => void }) {
  return <ShopDialog title="找一盏喜欢的灯" eyebrow="街角小店 · 每一扇门后，都有一个小世界" onClose={onClose} wide>
    <p className="shop-intro">看看门面，走进去。你不必急着开口，也可以只是坐一会儿。</p>
    <div className="shop-directory">{shops.map(shop => <article className="shop-directory-card" key={shop.id}>
      <button type="button" className="shop-directory-picture" onClick={() => onVisit(shop)} aria-label={`来到${shop.name}的门前`}><ScenePicture scene={shop.scenes.outdoor} alt={`${shop.name}的门面`} /><span className={`shop-card-sign sign-${shop.signStyle}`}>{shop.name}</span></button>
      <div className="shop-card-content"><div className="shop-card-kind">{shop.kind === "system" ? "爷爷的 AI 小店" : shop.kind === "demo" ? "街角示例小店" : shop.isOwner ? "我的小店" : "真人店主"}</div><h3>{shop.name}</h3><p>{shop.description || "门开着，欢迎你坐坐。"}</p><footer><span><EnvelopeSimple size={14} />{shop.acceptingLetters ? "欢迎来信" : "今日歇信"}</span><button type="button" onClick={() => onVisit(shop)}>去门前看看<ArrowRight size={16} /></button></footer></div>
    </article>)}</div>
    {shops.length === 0 && <p className="shop-empty">街灯还在慢慢点亮，请稍后再来看看。</p>}
  </ShopDialog>;
}
