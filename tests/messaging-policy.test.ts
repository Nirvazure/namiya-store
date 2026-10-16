import { describe, expect, it } from "vitest";
import { extractResponseText, participantRole, requestId, textField } from "@/lib/server/messaging-policy";

describe("private correspondence authorization", () => {
  const thread = { visitorId: "visitor", shopOwnerId: "owner" };
  it("recognizes the two participants and rejects a third account", () => {
    expect(participantRole(thread, "visitor")).toBe("visitor");
    expect(participantRole(thread, "owner")).toBe("owner");
    expect(participantRole(thread, "stranger")).toBeNull();
    expect(participantRole({ ...thread, shopOwnerId: null }, "owner")).toBeNull();
  });
  it("rejects missing, empty and oversized letters and unsafe idempotency keys", () => {
    expect(() => textField(null, 100)).toThrow();
    expect(() => textField("  ", 100)).toThrow();
    expect(() => textField("abcd", 3)).toThrow();
    expect(textField("  你好  ", 10)).toBe("你好");
    expect(requestId("d9f8a172-826a-4ee2-a945-3a5bf43f7a56")).toContain("d9f8a172");
    expect(() => requestId("../../secret")).toThrow();
    expect(() => requestId("short")).toThrow();
  });
});

describe("Responses API text parsing", () => {
  it("reads the actual REST output array rather than relying on SDK-only output_text", () => {
    expect(extractResponseText({ status: "completed", output: [
      { type: "reasoning", summary: [] },
      { type: "message", content: [{ type: "output_text", text: "亲爱的朋友：" }, { type: "output_text", text: "愿你今晚安睡。" }] },
    ] })).toBe("亲爱的朋友：\n愿你今晚安睡。");
  });
  it("does not turn refusals, failures or truncated output into a fabricated successful letter", () => {
    expect(() => extractResponseText({ status: "failed", output_text: "unfinished" })).toThrow();
    expect(() => extractResponseText({ status: "incomplete", output: [] })).toThrow();
    expect(() => extractResponseText({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] })).toThrow();
    expect(() => extractResponseText({})).toThrow();
  });
});
