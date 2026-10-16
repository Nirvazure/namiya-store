"use client";
import { useEffect, useRef } from "react";
import { SignOut } from "@phosphor-icons/react/dist/csr/SignOut";
import { X } from "@phosphor-icons/react/dist/csr/X";
import { UserCenterEntry } from "@/components/scene/UserCenterEntry";
import type { CurrentUser, Shop } from "@/domain/shops";

type Props = {
  user: CurrentUser | null; own: Shop | null; ready: boolean; open: boolean; busy: boolean; error: string;
  onToggle: () => void; onClose: () => void; onSignOut: () => void; onRetry: () => void;
  onSettings: (setting: Partial<Pick<Shop, "isOpen" | "discoverable" | "acceptingLetters">>) => void;
};
export function WorldAccount({ user, own, ready, open, busy, error, onToggle, onClose, onSignOut, onRetry, onSettings }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const element = root.current;
    const previous = document.activeElement as HTMLElement | null;
    const box = element?.querySelector<HTMLElement>("[role=dialog]");
    box?.querySelector<HTMLElement>("button,input")?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key === "Tab") {
        const controls = Array.from(box?.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled)") ?? []);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }
    function outside(event: PointerEvent) { if (event.target instanceof Node && !element?.contains(event.target)) close.current(); }
    document.addEventListener("keydown", keydown); document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("pointerdown", outside); previous?.focus({ preventScroll: true }); };
  }, [open]);
  return <div className="world-account" ref={root}>
    <UserCenterEntry user={user ? { nickname: user.displayName, avatarUrl: user.avatarUrl ?? undefined } : undefined} onOpenAccount={onToggle} expanded={open} disabled={!ready} />
    {open && user && <section className="account-popover" role="dialog" aria-modal="true" aria-labelledby="account-settings-title">
      <header><h2 id="account-settings-title">留一盏灯</h2><button type="button" onClick={onClose} aria-label="关闭账号菜单"><X size={18} /></button></header>
      <p className="account-caption">{own?.name ?? "正在准备你的小店"}</p>
      {error && <p className="account-error" role="alert">{error}<button type="button" onClick={onRetry}>重新连接</button></p>}
      {own && <fieldset disabled={busy}><legend className="sr-only">本人小店营业设置</legend>
        {([["isOpen", "小店营业", "关店后，老朋友仍能续信。"], ["discoverable", "参与随机发现", "关闭后，仍可通过链接和收藏来访。"], ["acceptingLetters", "接收新来信", "已有往来不受此开关影响。"]] as const).map(([key, label, help]) => <label className="account-setting" key={key}><span><strong>{label}</strong><small>{help}</small></span><input type="checkbox" role="switch" aria-label={label} checked={own[key]} onChange={event => onSettings({ [key]: event.target.checked })} /></label>)}
      </fieldset>}
      {busy && <p role="status" className="account-caption">正在保存…</p>}
      <button className="account-signout" type="button" onClick={onSignOut} disabled={busy}><SignOut size={16} />退出本站登录</button>
    </section>}
  </div>;
}
