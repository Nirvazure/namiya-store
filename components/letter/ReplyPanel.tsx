"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { useLetterDialog } from "@/components/letter/useLetterDialog";
import { characters } from "@/domain/characters";
import type { LetterReply } from "@/domain/letterTypes";
import { PixelButton } from "@/components/ui/PixelButton";

type ReplyPanelProps = {
  reply: LetterReply;
  onClose: () => void;
};

export function ReplyPanel({ reply, onClose }: ReplyPanelProps) {
  const titleId = useId();
  const dialogRef = useLetterDialog(true, onClose);
  const reducedMotion = useReducedMotion();
  const character = characters.find((item) => item.id === reply.characterId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18251f]/70 px-4 py-6 backdrop-blur-sm">
      <motion.section
        aria-labelledby={titleId}
        aria-modal="true"
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        animate={{ opacity: 1, y: 0 }}
        className="max-h-[90dvh] w-full max-w-3xl overflow-auto overscroll-contain rounded-[3px_7px_4px_6px] border border-[#b4a78f] bg-[#f1e9d9] bg-[radial-gradient(ellipse_at_15%_0%,rgba(206,178,130,.18),transparent_70%)] p-6 text-[#3c463a] shadow-[0_18px_70px_rgba(12,23,17,.16)] outline-none md:p-10"
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        transition={{ duration: reducedMotion ? 0 : 0.3 }}
      >
        <div className="border-b border-[#c9bca3] pb-5">
          <p className="text-xs tracking-[0.15em] text-[#7d806a]">来自 {character?.name ?? (reply.characterId === "cat" ? "旧版陪伴回信" : "杂货店")}</p>
          <h2 className="mt-3 font-serif text-2xl leading-relaxed tracking-wide" id={titleId}>门口旧邮箱的回信</h2>
        </div>
        <article className="whitespace-pre-wrap py-7 font-serif text-base leading-9 tracking-wide">{reply.content}</article>
        <div className="flex justify-end">
          <PixelButton onClick={onClose}>收好这封信</PixelButton>
        </div>
      </motion.section>
    </div>
  );
}
