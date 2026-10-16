import { extractResponseText } from "@/lib/server/messaging-policy";
import { buildCharacterPrompt } from "@/services/ai/prompts";
import { pcmToWave, splitSpeechText } from "@/lib/server/speech-audio";

export type ConversationTurn = { role: "user" | "assistant"; content: string };

export async function createGrandpaReply(turns: ConversationTurn[]): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("爷爷的 AI 回信尚未配置，请稍后重试。");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      store: false,
      max_output_tokens: 1800,
      instructions: `${buildCharacterPrompt("grandpa")}\n你是 AI 陪伴角色，请勿声称是真人。保持温柔、不评判的书信语气，回信不超过1200个汉字。`,
      input: turns,
    }),
  });
  if (!response.ok) throw new Error("爷爷暂时没能完成回信，请稍后重试。");
  return extractResponseText(await response.json());
}

export async function createGrandpaSpeech(text: string): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("语音朗读尚未配置，请稍后重试。");
  const signal = AbortSignal.timeout(90_000);
  const segments: Buffer[] = [];
  for (const input of splitSpeechText(text)) {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal,
      body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts", voice: process.env.OPENAI_TTS_VOICE ?? "sage", input, response_format: "pcm" }),
    });
    if (!response.ok) throw new Error("朗读暂时失败，请重试；文字回信已保留。");
    segments.push(Buffer.from(await response.arrayBuffer()));
  }
  return pcmToWave(segments);
}
