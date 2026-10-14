import type { CharacterId, LetterReply, PrivacyMode } from "@/domain/letterTypes";
import { createMockReply } from "@/services/ai/mockReplyService";
import { buildCharacterPrompt } from "@/services/ai/prompts";

type ReplyInput = {
  title: string;
  body: string;
  characterId: CharacterId;
  privacyMode: PrivacyMode;
};

export async function createLetterReply(input: ReplyInput): Promise<LetterReply> {
  if (!process.env.OPENAI_API_KEY) {
    return createMockReply(input);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: buildCharacterPrompt(input.characterId),
          },
          {
            role: "user",
            content: `标题：${input.title || "无标题"}\n\n正文：${input.body}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return createMockReply(input);
    }

    const data = (await response.json()) as { output_text?: string };
    return {
      letterId: crypto.randomUUID(),
      characterId: input.characterId,
      content: data.output_text || (await createMockReply(input)).content,
      createdAt: new Date().toISOString(),
      source: "openai",
    };
  } catch {
    return createMockReply(input);
  }
}
