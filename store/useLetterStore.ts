"use client";

import { create } from "zustand";
import { defaultCharacter } from "@/domain/characters";
import { isLetterReply } from "@/domain/letterTypes";
import type {
  CharacterId,
  LetterDraft,
  LetterFlowState,
  LetterReply,
  MailboxState,
  PrivacyMode,
} from "@/domain/letterTypes";
import { readLocalValue, writeLocalValue } from "@/services/storage/localStorageService";

type RecentLetter = {
  title: string;
  body: string;
  characterId: CharacterId;
  privacyMode: PrivacyMode;
  reply: LetterReply;
};

type LetterStore = {
  flowState: LetterFlowState;
  mailboxState: MailboxState;
  draft: LetterDraft;
  selectedCharacterId: CharacterId;
  privacyMode: PrivacyMode;
  reply?: LetterReply;
  error?: string;
  openIntroLetter: () => void;
  openLetter: () => void;
  closeLetter: () => void;
  updateDraft: (draft: Partial<LetterDraft>) => void;
  beginCharacterSelection: () => boolean;
  prepareEnvelope: () => boolean;
  setSelectedCharacter: (characterId: CharacterId) => void;
  setPrivacyMode: (mode: PrivacyMode) => void;
  beginDelivery: () => void;
  failDelivery: (message: string) => void;
  setReply: (reply: LetterReply) => void;
  openReply: () => void;
  resetLetter: () => void;
  hydrateRecent: () => void;
};

const RECENT_KEY = "namiya.recent-letter";

const emptyDraft: LetterDraft = {
  title: "",
  body: "",
};

export const useLetterStore = create<LetterStore>((set, get) => ({
  flowState: "idle",
  mailboxState: "normal",
  draft: emptyDraft,
  selectedCharacterId: defaultCharacter.id,
  privacyMode: "private",
  openIntroLetter: () =>
    set({
      flowState: "letterWriting",
      mailboxState: "glowing",
    }),
  openLetter: () =>
    set({
      flowState: "letterWriting",
      mailboxState: "open",
      error: undefined,
    }),
  closeLetter: () =>
    set((state) => ({
      flowState: "idle",
      mailboxState: state.reply ? "hasReply" : "normal",
      error: undefined,
    })),
  updateDraft: (draft) =>
    set((state) => ({
      draft: {
        ...state.draft,
        ...draft,
        updatedAt: new Date().toISOString(),
      },
    })),
  beginCharacterSelection: () => {
    const body = get().draft.body.trim();
    if (!body) {
      set({ error: "请先写下一点想投进邮箱的话。" });
      return false;
    }

    set({ flowState: "characterSelecting", error: undefined });
    return true;
  },
  prepareEnvelope: () => {
    if (get().flowState === "delivering") return false;
    if (!get().draft.body.trim()) {
      set({ error: "请先写下一点想投进邮箱的话。" });
      return false;
    }
    set({ flowState: "envelopeReady", mailboxState: "normal", error: undefined });
    return true;
  },
  setSelectedCharacter: (characterId) => set({ selectedCharacterId: characterId === "cat" ? "grandpa" : characterId }),
  setPrivacyMode: (mode) => set({ privacyMode: mode }),
  beginDelivery: () =>
    set({
      flowState: "delivering",
      mailboxState: "delivering",
      error: undefined,
    }),
  failDelivery: (message) =>
    set({
      flowState: "envelopeReady",
      mailboxState: "normal",
      error: message,
    }),
  setReply: (reply) => {
    const { draft, selectedCharacterId, privacyMode } = get();
    try {
      writeLocalValue<RecentLetter>(RECENT_KEY, {
        title: draft.title,
        body: draft.body,
        characterId: selectedCharacterId,
        privacyMode,
        reply,
      });
    } catch {
      // Storage may be unavailable; keep the delivered reply readable this visit.
    }
    set({
      reply,
      flowState: "replyReady",
      mailboxState: "hasReply",
      error: undefined,
    });
  },
  openReply: () => set({ flowState: "replyReading", mailboxState: "open" }),
  resetLetter: () =>
    set({
      flowState: "idle",
      mailboxState: "normal",
      draft: emptyDraft,
      selectedCharacterId: defaultCharacter.id,
      privacyMode: "private",
      reply: undefined,
      error: undefined,
    }),
  hydrateRecent: () => {
    const value = readLocalValue<unknown>(RECENT_KEY, null);
    if (typeof value !== "object" || value === null) return;
    const recent = value as Record<string, unknown>;
    if (
      typeof recent.title === "string" &&
      typeof recent.body === "string" && recent.body.trim().length > 0 &&
      (recent.characterId === "grandpa" || recent.characterId === "cat" || recent.characterId === "clerk") &&
      (recent.privacyMode === "private" || recent.privacyMode === "anonymous") &&
      isLetterReply(recent.reply)
    ) {
      set({
        selectedCharacterId: recent.characterId === "cat" ? "grandpa" : recent.characterId,
        privacyMode: recent.privacyMode,
        reply: recent.reply,
        mailboxState: "hasReply",
      });
    }
  },
}));
