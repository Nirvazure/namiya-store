import { characters } from "@/domain/characters";
import type { CharacterId, LetterReply, PrivacyMode } from "@/domain/letterTypes";

type MockReplyInput = {
  title: string;
  body: string;
  characterId: CharacterId;
  privacyMode: PrivacyMode;
};

export async function createMockReply(input: MockReplyInput): Promise<LetterReply> {
  const character = characters.find((item) => item.id === input.characterId) ?? characters[0];
  const letterId = crypto.randomUUID();
  const concern = input.title.trim() || "这封没写标题的信";
  const anonymousNote =
    input.privacyMode === "anonymous"
      ? "\n\n你也把这封信放进了匿名信箱。现在它还只是安静地躺在那里，等以后这间店开放给更多愿意认真回信的人。"
      : "";

  const openings: Record<CharacterId, string> = {
    grandpa: "我把你的信在柜台灯下读了两遍。你写下来的那些话，不是麻烦，也不是矫情，它们只是终于有了一个可以放下来的地方。",
    cat: "我趴在邮箱旁边看完了。先把肩膀松一点吧，这封信已经好好到了店里。",
    clerk: "我读完以后，感觉你现在最累的地方不是某一件事本身，而是一直在撑着、判断着、忍着。",
  };

  const advice: Record<CharacterId, string> = {
    grandpa: "今晚先不要急着把所有问题都想明白。你可以只做一件很小的事：把最让你难受的那一部分写成一句话，然后问问自己，明天早上能不能只处理其中十分之一。",
    cat: "如果脑袋还很吵，就先喝口水，摸摸杯沿，听一小会儿雨声。很多事情不是马上变好，但你可以先不用一个人绷得那么紧。",
    clerk: "我建议你先把事情分成三类：你能马上做的、需要别人回应的、今天无论如何也解决不了的。最后一类先放下，不是逃避，是节省力气。",
  };

  return {
    letterId,
    characterId: character.id,
    content: `给写下「${concern}」的你：\n\n${openings[character.id]}\n\n${advice[character.id]}\n\n如果明天醒来，这件事还是在心里，你也可以再来店里。门口那只旧邮箱会一直在。${anonymousNote}\n\n${character.name}`,
    createdAt: new Date().toISOString(),
    source: "mock",
  };
}
