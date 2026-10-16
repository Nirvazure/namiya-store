"use client";
import { House } from "@phosphor-icons/react/dist/csr/House";
import { Plus } from "@phosphor-icons/react/dist/csr/Plus";
import type { CurrentUser, Shop } from "@/domain/shops";
import { ShopAvatar } from "./ShopAvatar";

export function ShopAnchors({ user, own, current, favorites, unread, hasMore, onVisit, onLogin, onMore }: {
  user: CurrentUser | null; own: Shop | null; current: Shop; favorites: Shop[]; unread: boolean; hasMore: boolean;
  onVisit: (id: string) => void; onLogin: () => void; onMore: () => void;
}) {
  const anchor = (id: string, name: string, url: string | null | undefined, closed: boolean, self = false) => <button key={id} className={`shop-anchor ${closed ? "anchor-closed" : ""}`} type="button" aria-label={`${self ? "回自己的店：" : ""}${name}${closed ? "，暂时关店" : ""}`} title={`${self ? "回自己的店 · " : ""}${name}${closed ? " · 暂时关店" : ""}`} aria-current={current.id === id ? "location" : undefined} onClick={() => onVisit(id)}>
    <ShopAvatar key={url ?? id} url={url} name={name} official={id === "grandpa"} />
    {self && <span className="anchor-home" aria-hidden="true"><House size={11} weight="fill" /></span>}
    {self && unread && <span className="anchor-unread" aria-label="有未读来信" />}
    {closed && <span className="anchor-shut" aria-hidden="true" />}
    <span className="anchor-label">{name}{closed ? " · 关店" : ""}</span>
  </button>;
  return <nav className="shop-anchors" aria-label="小店头像导航">
    <div className="anchor-pins">
      {own ? anchor(own.id, own.name, user?.avatarUrl, !own.isOpen, true)
        : <button className="shop-anchor" type="button" aria-label={user ? "重试准备自己的店" : "登录并回自己的店"} onClick={onLogin}><ShopAvatar name="" /><span className="anchor-label">{user ? "准备小店" : "登录"}</span></button>}
      {anchor("grandpa", "解忧杂货店", null, false)}
    </div>
    {favorites.length > 0 && <div className="anchor-favorites" aria-label="收藏的小店">{favorites.filter(shop => shop.id !== own?.id).map(shop => anchor(shop.id, shop.name, shop.ownerAvatarUrl, !shop.isOpen))}{hasMore && <button className="shop-anchor anchor-more" type="button" onClick={onMore} aria-label="加载更多收藏"><Plus size={20} /></button>}</div>}
  </nav>;
}
