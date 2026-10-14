import type { ReactNode } from "react";

type PixelCardProps = {
  children: ReactNode;
  className?: string;
};

export function PixelCard({ children, className = "" }: PixelCardProps) {
  return (
    <section
      className={`border-2 border-amber-200/50 bg-stone-950/82 p-4 text-amber-50 shadow-[0_8px_0_rgba(28,25,23,0.8)] backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  );
}
