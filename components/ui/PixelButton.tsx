import type { ButtonHTMLAttributes, ReactNode } from "react";

type PixelButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
};

export function PixelButton({ children, className = "", variant = "primary", ...props }: PixelButtonProps) {
  const variants = {
    primary: "border-[#344b42] bg-[#344b42] text-[#f6f0e4] hover:border-[#263c33] hover:bg-[#263c33]",
    secondary: "border-[#b7a68c] bg-[#e6dcc8] text-[#39493f] hover:bg-[#dbceb6]",
    ghost: "border-[#a99b81]/60 bg-transparent text-[#5e6657] hover:bg-[#d7cbb4]/35",
  };

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-sm border px-5 py-2.5 text-sm font-medium tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#668072] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
