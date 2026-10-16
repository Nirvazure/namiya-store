import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultShop } from "@/domain/shops";
import type { ThreadDetail } from "@/domain/threads";

const mockApi = vi.hoisted(() => vi.fn());
vi.mock("@/services/api/client", () => ({ api: mockApi, errorMessage: (error: unknown) => error instanceof Error ? error.message : "连接失败" }));
import { useLetterStore } from "@/store/useLetterStore";
import { deliverPreparedLetter } from "@/services/letters/deliverLetter";

const initial = useLetterStore.getInitialState();
const secondShop = { ...defaultShop, id: "other-shop", name: "另一个小店" };
const result: ThreadDetail = { thread: { id: "saved-thread", shopId: "grandpa", shopName: "解忧杂货店", title: "心事", signature: null, viewerRole: "visitor", isAi: true,
  unread: false, blocked: false, generationStatus: "pending", updatedAt: new Date().toISOString() }, messages: [] };

beforeEach(() => {
  mockApi.mockReset();
  const storage = new Map<string, string>();
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
  useLetterStore.setState({ ...initial, draft: { title: "", body: "" } }, true);
});
afterEach(() => { vi.unstubAllGlobals(); });

function prepare(body = "今天很累") {
  const store = useLetterStore.getState();
  store.setContext("account-a", defaultShop);
  store.updateDraft({ title: "心事", body });
  store.prepareEnvelope();
  return useLetterStore.getState().clientRequestId;
}

describe("letter drafts and identity isolation", () => {
  it("keeps each account and shop draft, signature and request ID separate", () => {
    const store = useLetterStore.getState();
    const id = prepare();
    store.setSignature("灯下的人");
    store.prepareEnvelope();
    const signedId = useLetterStore.getState().clientRequestId;
    expect(signedId).not.toBe(id);
    store.setContext("account-a", secondShop);
    expect(useLetterStore.getState()).toMatchObject({ draft: { body: "" }, signature: "", clientRequestId: "" });
    store.updateDraft({ body: "另一家店的心事" });
    store.setContext("account-b", defaultShop);
    expect(useLetterStore.getState()).toMatchObject({ draft: { body: "" }, signature: "", clientRequestId: "", reply: undefined });
    store.updateDraft({ body: "另一个账号的心事" });
    store.setContext("account-a", defaultShop);
    expect(useLetterStore.getState()).toMatchObject({ draft: { body: "今天很累" }, signature: "灯下的人", clientRequestId: signedId });
    store.setContext("account-a", secondShop);
    expect(useLetterStore.getState().draft.body).toBe("另一家店的心事");
  });
  it("clears account-only in-memory data on signout and restores its own draft on return", () => {
    prepare();
    const store = useLetterStore.getState();
    store.setSignature("只有账号A的署名");
    store.failDelivery("账号A的失败信息");
    store.setContext(null, defaultShop);
    expect(useLetterStore.getState()).toMatchObject({ userId: null, draft: { body: "" }, signature: "", reply: undefined, error: undefined });
    store.setContext("account-a", defaultShop);
    expect(useLetterStore.getState().draft.body).toBe("今天很累");
  });
  it("assigns a new idempotency key after body, title or signature changes", () => {
    let previous = prepare();
    for (const edit of [() => useLetterStore.getState().updateDraft({ body: "心事变了" }), () => useLetterStore.getState().updateDraft({ title: "新标题" }), () => useLetterStore.getState().setSignature("新的署名")]) {
      edit();
      expect(useLetterStore.getState().clientRequestId).toBe("");
      useLetterStore.getState().prepareEnvelope();
      expect(useLetterStore.getState().clientRequestId).not.toBe(previous);
      previous = useLetterStore.getState().clientRequestId;
    }
  });
  it("rehydrates a failed draft with its original idempotency key", () => {
    const id = prepare();
    const store = useLetterStore.getState();
    store.failDelivery("超时");
    store.setContext("account-b", defaultShop);
    store.setContext("account-a", defaultShop);
    store.hydrateRecent();
    store.prepareEnvelope();
    expect(useLetterStore.getState().clientRequestId).toBe(id);
  });
});

describe("letter delivery recovery", () => {
  it("retries a timeout with the same key and clears the delivered draft only after success", async () => {
    const id = prepare();
    mockApi.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce(result);
    await expect(deliverPreparedLetter()).resolves.toBeUndefined();
    expect(useLetterStore.getState()).toMatchObject({ flowState: "envelopeReady", draft: { body: "今天很累" }, clientRequestId: id });
    await expect(deliverPreparedLetter()).resolves.toBe(result);
    expect(mockApi.mock.calls.map(call => JSON.parse(call[1].body).clientRequestId)).toEqual([id, id]);
    expect(useLetterStore.getState()).toMatchObject({ flowState: "idle", draft: { body: "" }, clientRequestId: "" });
  });
  it("coalesces a double click while a delivery is pending", async () => {
    prepare();
    let resolve!: (value: ThreadDetail) => void;
    mockApi.mockReturnValue(new Promise<ThreadDetail>(done => { resolve = done; }));
    const pending = deliverPreparedLetter();
    await expect(deliverPreparedLetter()).resolves.toBeUndefined();
    expect(mockApi).toHaveBeenCalledTimes(1);
    resolve(result);
    await pending;
  });
  it("ignores a completed response after switching accounts", async () => {
    prepare();
    let resolve!: (value: ThreadDetail) => void;
    mockApi.mockReturnValue(new Promise<ThreadDetail>(done => { resolve = done; }));
    const pending = deliverPreparedLetter();
    useLetterStore.getState().setContext("account-b", defaultShop);
    useLetterStore.getState().updateDraft({ body: "账号B的私密草稿" });
    resolve(result);
    await expect(pending).resolves.toBeUndefined();
    expect(useLetterStore.getState().draft.body).toBe("账号B的私密草稿");
  });
  it("does not clear a new revision in the same account and shop when an older request completes", async () => {
    prepare();
    let resolve!: (value: ThreadDetail) => void;
    mockApi.mockReturnValue(new Promise<ThreadDetail>(done => { resolve = done; }));
    const pending = deliverPreparedLetter();
    useLetterStore.getState().updateDraft({ body: "尚未投递的新版本" });
    resolve(result);
    await expect(pending).resolves.toBeUndefined();
    expect(useLetterStore.getState().draft.body).toBe("尚未投递的新版本");
  });
});
