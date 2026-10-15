"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useLetterDialog } from "@/components/letter/useLetterDialog";
import { characters } from "@/domain/characters";
import type { CharacterId } from "@/domain/letterTypes";
import { useLetterStore } from "@/store/useLetterStore";
import "./letter-paper.css";

export function LetterPanel() {
  const flowState = useLetterStore((state) => state.flowState);
  const isOpen = flowState === "letterWriting" || flowState === "characterSelecting" || flowState === "privacySelecting";
  return isOpen ? <LetterDesk /> : null;
}

function LetterDesk() {
  const titleId = useId();
  const bodyId = useId();
  const errorId = useId();
  const draft = useLetterStore((state) => state.draft);
  const storeError = useLetterStore((state) => state.error);
  const selectedCharacterId = useLetterStore((state) => state.selectedCharacterId);
  const privacyMode = useLetterStore((state) => state.privacyMode);
  const updateDraft = useLetterStore((state) => state.updateDraft);
  const closeLetter = useLetterStore((state) => state.closeLetter);
  const setSelectedCharacter = useLetterStore((state) => state.setSelectedCharacter);
  const setPrivacyMode = useLetterStore((state) => state.setPrivacyMode);
  const prepareEnvelope = useLetterStore((state) => state.prepareEnvelope);
  const dialogRef = useLetterDialog(true, closeLetter);
  const reducedMotion = useReducedMotion();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const foldTimer = useRef<number | null>(null);
  const [isFolding, setIsFolding] = useState(false);
  const [localError, setLocalError] = useState("");
  const error = localError || storeError;
  const recipient = characters.find((character) => character.id === selectedCharacterId);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const resize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draft.body]);

  useEffect(() => () => {
    if (foldTimer.current !== null) window.clearTimeout(foldTimer.current);
  }, []);

  function foldLetter() {
    if (isFolding) return;
    if (!draft.body.trim()) {
      setLocalError("先写下一点心事，再把信纸折好。哪怕只有一句也可以。");
      textareaRef.current?.focus();
      return;
    }
    setLocalError("");
    setIsFolding(true);
    foldTimer.current = window.setTimeout(() => {
      foldTimer.current = null;
      prepareEnvelope();
    }, reducedMotion ? 150 : 1900);
  }

  return (
    <motion.section
      className={`namiya-writing-desk${isFolding ? " namiya-writing-desk--folding" : ""}`}
      aria-labelledby={titleId}
      aria-modal="true"
      role="dialog"
      ref={dialogRef}
      tabIndex={-1}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.4 }}
    >
      <div className="namiya-writing-desk__light" aria-hidden="true" />
      <header className="namiya-writing-desk__toolbar">
        <span className="namiya-writing-desk__eyebrow">解忧杂货店 <span aria-hidden="true">/</span> 一封未寄出的信</span>
        <button className="namiya-writing-desk__close" onClick={closeLetter} type="button" aria-label="收起信纸，保留草稿">
          收起信纸 <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="namiya-writing-desk__scroll">
        <div className="namiya-writing-desk__workspace">
          <div className="namiya-writing-desk__pencil" aria-hidden="true" />
          <motion.div
            className="letter-sheet-stack"
            initial={reducedMotion ? false : { y: 45, rotate: -1.5, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.65, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="letter-sheet">
              <div className="letter-sheet__texture" aria-hidden="true" />
              <div className="letter-sheet__crease letter-sheet__crease--top" aria-hidden="true" />
              <div className="letter-sheet__crease letter-sheet__crease--bottom" aria-hidden="true" />
              <div className="letter-sheet__content">
                <div className="letter-sheet__masthead">
                  <span className="letter-sheet__mark" aria-hidden="true">浪矢</span>
                  <span>心事便笺<br /><span lang="en">Namiya General Store</span></span>
                </div>
                <h2 id={titleId} className="letter-sheet__salutation">亲爱的{recipient?.name ?? "杂货店爷爷"}：</h2>
                <label className="letter-sheet__title">
                  <span className="sr-only">标题，可不写</span>
                  <input
                    aria-label="标题，可不写"
                    placeholder="关于……（标题，可以留白）"
                    value={draft.title}
                    disabled={isFolding}
                    onChange={(event) => updateDraft({ title: event.target.value })}
                  />
                </label>
                <label htmlFor={bodyId} className="sr-only">写下你的心事</label>
                <textarea
                  id={bodyId}
                  ref={textareaRef}
                  className="letter-sheet__body"
                  data-dialog-initial-focus
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? errorId : undefined}
                  placeholder={"见字如面。\n\n有些话，一直没能说出口……"}
                  value={draft.body}
                  disabled={isFolding}
                  onChange={(event) => {
                    updateDraft({ body: event.target.value });
                    if (localError) setLocalError("");
                  }}
                />
                <div className="letter-sheet__signature"><span>一个愿意慢慢听你说话的地方</span><span>写于今夜</span></div>
              </div>
            </div>
            <div className="letter-fold letter-fold--top" aria-hidden="true" />
            <div className="letter-fold letter-fold--bottom" aria-hidden="true" />
            <div className="letter-fold-envelope" aria-hidden="true"><span>致 · 解忧杂货店</span><i /></div>
          </motion.div>

          <div className="namiya-writing-desk__below">
            <details className="namiya-writing-desk__settings">
              <summary>{recipient?.name ?? "杂货店爷爷"}收 · {privacyMode === "private" ? "仅店内可读" : "允许未来匿名互助"}<span>更改</span></summary>
              <div className="namiya-writing-desk__settings-content">
                <label>把信交给
                  <select value={selectedCharacterId} disabled={isFolding} onChange={(event) => setSelectedCharacter(event.target.value as CharacterId)}>
                    {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
                  </select>
                </label>
                <label className="namiya-writing-desk__privacy"><input type="checkbox" checked={privacyMode === "anonymous"} disabled={isFolding} onChange={(event) => setPrivacyMode(event.target.checked ? "anonymous" : "private")} /><span>允许这封信用于未来的匿名互助</span></label>
                <p>默认私密。匿名互助选项仅保存你的意愿，目前不会公开分发。</p>
              </div>
            </details>
            {error ? <p id={errorId} className="namiya-writing-desk__error" role="alert">{error}</p> : null}
            <div className="namiya-writing-desk__actions">
              <p>不用措辞完美，写到这里就很好。</p>
              <button className="namiya-writing-desk__fold-button" onClick={foldLetter} disabled={isFolding} type="button">
                {isFolding ? "正在折好信纸…" : "折好信纸"}<span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="namiya-writing-desk__fold-status" role="status">{isFolding ? "把心事折好，装进信封。" : ""}</p>
    </motion.section>
  );
}

