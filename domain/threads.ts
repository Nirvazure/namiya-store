export type GenerationStatus = "idle" | "pending" | "generating" | "failed";
export type ThreadSummary = {
  id: string;
  shopId: string;
  shopName: string;
  title: string;
  signature: string | null;
  viewerRole: "visitor" | "owner";
  isAi: boolean;
  unread: boolean;
  blocked: boolean;
  generationStatus: GenerationStatus;
  updatedAt: string;
};
export type ThreadMessage = {
  id: string;
  role: "visitor" | "owner" | "system";
  body: string;
  createdAt: string;
  source: "human" | "openai";
};
export type ThreadDetail = { thread: ThreadSummary; messages: ThreadMessage[] };
export type ThreadListResponse = { threads: ThreadSummary[] };
