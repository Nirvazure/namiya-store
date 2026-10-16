"use client";

import { create } from "zustand";
import type { CharacterId, LetterDraft, LetterFlowState, LetterReply, MailboxState, PrivacyMode } from "@/domain/letterTypes";
import { defaultShop, type Shop } from "@/domain/shops";
import { readLocalValue, writeLocalValue } from "@/services/storage/localStorageService";

type DraftRecord = { draft: LetterDraft; signature: string; clientRequestId: string };
type LetterStore = {
  flowState: LetterFlowState; mailboxState: MailboxState; draft: LetterDraft;
  selectedCharacterId: CharacterId; privacyMode: PrivacyMode; signature: string;
  shop: Shop; userId: string | null; clientRequestId: string;
  reply?: LetterReply; error?: string;
  setContext: (userId: string | null, shop: Shop) => void;
  setSignature: (value: string) => void;
  openIntroLetter: () => void; openLetter: () => void; closeLetter: () => void;
  updateDraft: (draft: Partial<LetterDraft>) => void;
  beginCharacterSelection: () => boolean; prepareEnvelope: () => boolean;
  setSelectedCharacter: (id: CharacterId) => void; setPrivacyMode: (mode: PrivacyMode) => void;
  beginDelivery: () => void; failDelivery: (message: string) => void; completeDelivery: () => void;
  setReply: (reply: LetterReply) => void; openReply: () => void; resetLetter: () => void;
  hydrateRecent: () => void;
};
function draftKey(userId: string | null, shopId: string) { return `namiya.draft.v2:${userId ?? "guest"}:${shopId}`; }
function emptyRecord(): DraftRecord { return { draft: { title: "", body: "" }, signature: "", clientRequestId: "" }; }
function readDraft(userId: string | null, shopId: string): DraftRecord {
  const raw = readLocalValue<Partial<DraftRecord> | null>(draftKey(userId, shopId), null);
  return raw && typeof raw.draft?.title === "string" && typeof raw.draft?.body === "string"
    ? { draft: raw.draft, signature: typeof raw.signature === "string" ? raw.signature : "", clientRequestId: typeof raw.clientRequestId === "string" ? raw.clientRequestId : "" }
    : emptyRecord();
}
function persist(state: Pick<LetterStore, "userId" | "shop" | "draft" | "signature" | "clientRequestId">) {
  writeLocalValue(draftKey(state.userId, state.shop.id), { draft: state.draft, signature: state.signature, clientRequestId: state.clientRequestId });
}
export const useLetterStore = create<LetterStore>((set, get) => ({
  flowState: "idle", mailboxState: "normal", draft: { title: "", body: "" },
  selectedCharacterId: "grandpa", privacyMode: "anonymous", signature: "", shop: defaultShop,
  userId: null, clientRequestId: "",
  setContext: (userId, shop) => {
    const state = get();
    if (state.userId === userId && state.shop.id === shop.id) { set({ shop }); return; }
    persist(state);
    set({ ...readDraft(userId, shop.id), userId, shop, flowState: "idle", mailboxState: "normal", reply: undefined, error: undefined });
  },
  setSignature: signature => { set({ signature, clientRequestId: "" }); persist(get()); },
  openIntroLetter: () => get().openLetter(),
  openLetter: () => set({ flowState: "letterWriting", mailboxState: "open", error: undefined }),
  closeLetter: () => set({ flowState: "idle", mailboxState: "normal", error: undefined }),
  updateDraft: draft => {
    set(state => ({ draft: { ...state.draft, ...draft, updatedAt: new Date().toISOString() }, clientRequestId: "" })); persist(get());
  },
  beginCharacterSelection: () => {
    if (!get().draft.body.trim()) { set({ error: "请先写下一点心事。" }); return false; }
    set({ flowState: "characterSelecting", error: undefined }); return true;
  },
  prepareEnvelope: () => {
    if (!get().draft.body.trim() || get().flowState === "delivering") return false;
    set(state => ({ flowState: "envelopeReady", mailboxState: "normal", clientRequestId: state.clientRequestId || crypto.randomUUID(), error: undefined }));
    persist(get()); return true;
  },
  setSelectedCharacter: selectedCharacterId => set({ selectedCharacterId }),
  setPrivacyMode: privacyMode => set({ privacyMode }),
  beginDelivery: () => set({ flowState: "delivering", mailboxState: "delivering", error: undefined }),
  failDelivery: error => set({ flowState: "envelopeReady", mailboxState: "normal", error }),
  completeDelivery: () => { set({ ...emptyRecord(), flowState: "idle", mailboxState: "normal", error: undefined }); persist(get()); },
  setReply: reply => set({ reply, flowState: "replyReady", mailboxState: "hasReply" }),
  openReply: () => set({ flowState: "replyReading" }),
  resetLetter: () => get().completeDelivery(),
  // Never assign the legacy local-only letter to a signed-in account.
  hydrateRecent: () => { set(readDraft(get().userId, get().shop.id)); },
}));
