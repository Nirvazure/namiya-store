export type CharacterId = "grandpa" | "cat" | "clerk";

export type PrivacyMode = "private" | "anonymous";

export type LetterFlowState =
  | "idle"
  | "intro"
  | "letterWriting"
  | "characterSelecting"
  | "privacySelecting"
  | "envelopeReady"
  | "delivering"
  | "replyReady"
  | "replyReading";

export type MailboxState = "normal" | "glowing" | "open" | "delivering" | "hasReply";

export type LetterDraft = {
  title: string;
  body: string;
  updatedAt?: string;
};

export type LetterSubmission = {
  id: string;
  title: string;
  body: string;
  characterId: CharacterId;
  privacyMode: PrivacyMode;
  createdAt: string;
};

export type LetterReply = {
  letterId: string;
  characterId: CharacterId;
  content: string;
  createdAt: string;
  source: "mock" | "openai";
};

export function isLetterReply(value: unknown): value is LetterReply {
  if (typeof value !== "object" || value === null) return false;
  const reply = value as Record<string, unknown>;
  return (
    typeof reply.letterId === "string" && reply.letterId.trim().length > 0 &&
    (reply.characterId === "grandpa" || reply.characterId === "cat" || reply.characterId === "clerk") &&
    typeof reply.content === "string" && reply.content.trim().length > 0 &&
    typeof reply.createdAt === "string" && Number.isFinite(Date.parse(reply.createdAt)) &&
    (reply.source === "mock" || reply.source === "openai")
  );
}

export type Character = {
  id: CharacterId;
  name: string;
  role: string;
  description: string;
  tone: string;
  isDefault?: boolean;
  isLocked?: boolean;
};

export type PomodoroMode = "focus" | "break";

export type PomodoroState = {
  mode: PomodoroMode;
  durationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  startedAt?: number;
};

export type MusicState = {
  trackId: string;
  isPlaying: boolean;
  volume: number;
};
