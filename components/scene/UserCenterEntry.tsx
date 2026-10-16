"use client";

import { ShopAvatar } from "@/components/shops/ShopAvatar";

export type UserCenterEntryProps = {
  user?: { nickname: string; avatarUrl?: string };
  onOpenAccount?: () => void;
  expanded?: boolean;
  disabled?: boolean;
};

export function UserCenterEntry({ user, onOpenAccount, expanded, disabled }: UserCenterEntryProps) {
  const available = Boolean(onOpenAccount);
  return <button className="user-center-entry" type="button" disabled={!available || disabled} onClick={onOpenAccount} aria-expanded={user ? expanded : undefined} aria-haspopup={user ? "dialog" : undefined} aria-label={user ? `${user.nickname}，账号与营业设置` : "登录"}>
    <ShopAvatar key={user?.avatarUrl ?? "guest"} url={user?.avatarUrl} name={user?.nickname ?? ""} />
    <span>{user?.nickname || "登录"}</span>
  </button>;
}
