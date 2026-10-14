"use client";

import type { ReactNode } from "react";

type SceneHotspotProps = {
  label: string;
  className?: string;
  children: ReactNode;
  onClick: () => void;
};

export function SceneHotspot({ label, className = "", children, onClick }: SceneHotspotProps) {
  return (
    <button
      aria-label={label}
      className={`group absolute outline-none transition hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-amber-200 ${className}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
