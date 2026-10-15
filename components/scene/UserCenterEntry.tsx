"use client";

import { UserCircle } from "@phosphor-icons/react/dist/csr/UserCircle";
import Image from "next/image";

export type UserCenterEntryProps = {
  user?: { nickname: string; avatarUrl?: string };
  onOpenAccount?: () => void;
};

export function UserCenterEntry({ user, onOpenAccount }: UserCenterEntryProps) {
  const available = Boolean(onOpenAccount);
  return <button className="user-center-entry" type="button" disabled={!available} onClick={onOpenAccount} aria-label={available ? `${user?.nickname ?? "用户中心"}，打开账号中心` : "用户中心，暂未开放"} title={available ? "打开用户中心" : "用户中心暂未开放"}>
    {user?.avatarUrl ? <Image className="user-center-avatar" src={user.avatarUrl} alt="" width={22} height={22} unoptimized /> : <UserCircle size={22} weight="light" aria-hidden="true" />}
    <span>{user?.nickname || "用户中心"}{!available && <small>暂未开放</small>}</span>
  </button>;
}
