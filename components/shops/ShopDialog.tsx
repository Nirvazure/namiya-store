"use client";

import { type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { useLetterDialog } from "@/components/letter/useLetterDialog";
import "./shops.css";

export function ShopDialog({ title, eyebrow, onClose, children, wide = false, dismissible = true }: { title: string; eyebrow: string; onClose: () => void; children: ReactNode; wide?: boolean; dismissible?: boolean }) {
  const dialog = useLetterDialog(true, () => { if (dismissible) onClose(); });
  return <div className="shop-dialog-backdrop" onClick={event => { if (dismissible && event.target === event.currentTarget) onClose(); }}><section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="shop-dialog-title" tabIndex={-1} className={`shop-dialog ${wide ? "shop-dialog-wide" : ""}`}><header className="shop-dialog-header"><div><p className="shop-eyebrow">{eyebrow}</p><h2 id="shop-dialog-title">{title}</h2></div><button type="button" className="shop-icon-button" aria-label="关闭窗口" onClick={onClose} disabled={!dismissible}><X size={22} /></button></header>{children}</section></div>;
}
