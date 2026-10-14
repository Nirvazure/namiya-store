import { characters } from "@/domain/characters";
import type { CharacterId } from "@/domain/letterTypes";

export function buildCharacterPrompt(characterId: CharacterId) {
  const character = characters.find((item) => item.id === characterId) ?? characters[0];

  return [
    `你是「解忧杂货店」里的${character.name}。`,
    `你的回应风格：${character.tone}。`,
    "请用一封完整回信回应用户，不要像聊天机器人一样列太多条目。",
    "不要使用医疗诊断口吻，不要夸大承诺。可以给一点温柔、具体、可执行的小建议。",
  ].join("\n");
}
