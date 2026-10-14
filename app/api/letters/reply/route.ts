import { NextRequest, NextResponse } from "next/server";
import { characters } from "@/domain/characters";
import type { CharacterId, PrivacyMode } from "@/domain/letterTypes";
import { createLetterReply } from "@/services/ai/replyService";

type ReplyRequest = {
  title?: string;
  body?: string;
  characterId?: CharacterId;
  privacyMode?: PrivacyMode;
};

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as ReplyRequest;
  const body = payload.body?.trim() ?? "";

  if (!body) {
    return NextResponse.json({ error: "Letter body is required." }, { status: 400 });
  }

  const characterId = characters.some((character) => character.id === payload.characterId)
    ? payload.characterId!
    : "grandpa";
  const privacyMode = payload.privacyMode === "anonymous" ? "anonymous" : "private";
  const reply = await createLetterReply({
    title: payload.title?.trim() ?? "",
    body,
    characterId,
    privacyMode,
  });

  return NextResponse.json(reply);
}
