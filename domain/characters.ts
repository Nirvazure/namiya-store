import type { Character } from "@/domain/letterTypes";

export const characters: Character[] = [
  {
    id: "grandpa",
    name: "杂货店爷爷",
    role: "默认回信人",
    description: "慢慢读完你的信，给一封温柔、克制、有生活感的回信。",
    tone: "温柔、耐心、少评判、像深夜店里的一盏灯",
    isDefault: true,
  },
  {
    id: "clerk",
    name: "夜班店员",
    role: "清醒型回信",
    description: "年轻一些，帮你把事情理顺，说话直接但不冰冷。",
    tone: "清醒、具体、同龄感、避免说教",
  },
];

export const defaultCharacter = characters.find((character) => character.isDefault) ?? characters[0];
