"use client";

import type { PrivacyMode } from "@/domain/letterTypes";

type PrivacySelectorProps = {
  privacyMode: PrivacyMode;
  onChange: (mode: PrivacyMode) => void;
};

const options: Array<{ id: PrivacyMode; title: string; description: string }> = [
  {
    id: "private",
    title: "只给店里的人看",
    description: "默认私密，只由你选择的回信角色处理这封信。",
  },
  {
    id: "anonymous",
    title: "也放进匿名信箱",
    description: "表示你允许未来匿名互助功能使用这封信，第一版不会公开分发。",
  },
];

export function PrivacySelector({ privacyMode, onChange }: PrivacySelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {options.map((option) => {
        const selected = privacyMode === option.id;
        return (
          <button
            key={option.id}
            className={`border-2 p-3 text-left transition active:translate-y-1 ${
              selected
                ? "border-amber-200 bg-amber-200 text-stone-950"
                : "border-stone-500 bg-stone-900 text-amber-50 hover:border-amber-200"
            }`}
            onClick={() => onChange(option.id)}
            type="button"
          >
            <h3 className="font-mono text-sm font-bold">{option.title}</h3>
            <p className="mt-2 text-sm leading-6 opacity-80">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
