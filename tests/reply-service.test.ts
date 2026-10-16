import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrandpaReply, createGrandpaSpeech } from "@/services/ai/replyService";
import { pcmToWave, splitSpeechText } from "@/lib/server/speech-audio";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("real OpenAI services", () => {
  it("does not fabricate a letter when credentials are missing", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(createGrandpaReply([{ role: "user", content: "你好" }])).rejects.toThrow("尚未配置");
    await expect(createGrandpaSpeech("你好")).rejects.toThrow("尚未配置");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses configured model, sends only supplied conversation and disables provider storage", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "configured-model");
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "愿你安好。" }] }] }) });
    vi.stubGlobal("fetch", fetch);
    const input = [{ role: "user" as const, content: "只属于这一封通信" }];
    await expect(createGrandpaReply(input)).resolves.toBe("愿你安好。");
    const payload = JSON.parse(fetch.mock.calls[0][1].body);
    expect(payload).toMatchObject({ model: "configured-model", store: false, input });
  });
  it("propagates upstream failure as retryable failure rather than mock content", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(createGrandpaReply([{ role: "user", content: "你好" }])).rejects.toThrow("重试");
  });
  it("chunks Chinese and emoji without losing text or exceeding the byte budget", () => {
    const text = "愿你今晚安睡，明日也有新的期待。🌙".repeat(160);
    const parts = splitSpeechText(text);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join("")).toBe(text);
    expect(parts.every(part => Buffer.byteLength(part, "utf8") <= 1800)).toBe(true);
    expect(parts.some(part => part.includes("�"))).toBe(false);
  });
  it("joins all speech segments into one playable wave with the correct sample count", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    const fetch = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => Uint8Array.of(1, 0, 2, 0).buffer });
    vi.stubGlobal("fetch", fetch);
    const text = "你好，愿你安好。".repeat(200);
    const wave = await createGrandpaSpeech(text);
    expect(fetch).toHaveBeenCalledTimes(splitSpeechText(text).length);
    expect(wave.subarray(0, 4).toString()).toBe("RIFF");
    expect(wave.subarray(8, 12).toString()).toBe("WAVE");
    expect(wave.readUInt32LE(24)).toBe(24_000);
    expect(wave.readUInt32LE(40)).toBe(fetch.mock.calls.length * 4);
    expect(wave.length).toBe(44 + fetch.mock.calls.length * 4);
    expect(fetch.mock.calls.every(call => JSON.parse(call[1].body).response_format === "pcm")).toBe(true);
    expect(() => pcmToWave([Buffer.from([1])])).toThrow();
  });
});
