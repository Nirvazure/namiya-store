import sceneManifests from "@/public/indoor/scenes.json";

export type CounterId = "grandpa" | "sashimi" | "dessert" | "matcha";
export type IndoorItemId = "sashimi" | "cake" | "matcha" | "coffee";

export const indoorLayers = sceneManifests[0].layers.map((layer) => ({ name: layer.id, depth: layer.depth * 24 }));

export const indoorEntryAssets = indoorLayers.map((layer) => `/indoor/optimized/grandpa/${layer.name}.webp`);

export const indoorCounters: { id: CounterId; name: string; english: string; keeper: string; invitation: string; description: string; dialogues: string[]; items: IndoorItemId[] }[] = [
  { id: "grandpa", name: "爷爷的柜台", english: "LETTERS & LITTLE TALKS", keeper: "浪矢爷爷", invitation: "先坐一会儿吧。", description: "有些话，写下来就轻了一点。", dialogues: ["欢迎回来。外面的风有些凉，进来坐坐吧。", "想不清楚的时候，不必急着找答案。先把心里那句话写下来。", "你的信，我会好好读。写好了，记得放进门外的红邮箱。"], items: [] },
  { id: "sashimi", name: "喵猫刺身", english: "A LITTLE TASTE OF THE SEA", keeper: "刺身师傅", invitation: "今天也有新鲜的海风。", description: "尝一口，再把烦恼放一放。", dialogues: ["欢迎光临。今天的鱼很新鲜，你可以慢慢挑。", "做料理和整理心事一样，一件一件来就好。", "坐稳了，我给你准备一小份。"], items: ["sashimi"] },
  { id: "dessert", name: "兔子的甜品屋", english: "SOMETHING SWEET FOR YOU", keeper: "甜品店长", invitation: "给今天留一点甜。", description: "没有特别的理由，也可以奖励自己。", dialogues: ["刚烤好的甜点，要尝一块吗？", "今天已经很努力了。休息一下，不需要理由。", "慢慢吃，糖霜会沾到嘴角哦。"], items: ["cake"] },
  { id: "matcha", name: "一盏抹茶", english: "LET THE WORLD WAIT A LITTLE", keeper: "抹茶店长", invitation: "热水正好，时间也正好。", description: "捧一杯温热，让脚步慢下来。", dialogues: ["抹茶还是咖啡？这里没有赶时间的人。", "先闻闻杯子里的香气，让脑袋也休息一会儿。", "热的，捧着就很舒服。小心烫。"], items: ["matcha", "coffee"] },
];

export const indoorItems: Record<IndoorItemId, { name: string; detail: string; preparing: string; served: string; tasted: string; verb: string }> = {
  sashimi: { name: "今日刺身", detail: "一小份海的鲜甜", preparing: "师傅正在挑选今天最鲜美的几片。", served: "给你。海的味道，慢慢尝。", tasted: "鲜甜在舌尖散开，今天似乎也轻了一点。", verb: "尝一口" },
  cake: { name: "草莓小蛋糕", detail: "奶油、草莓与一点好心情", preparing: "兔子店长正在为你装盘。", served: "甜点好了，最上面的草莓留给你。", tasted: "绵软的奶油和微酸的草莓，刚刚好。", verb: "尝一口" },
  matcha: { name: "手作抹茶", detail: "一杯安静的青绿", preparing: "茶筅沙沙响，抹茶正在泛起细细的泡沫。", served: "抹茶好了，先闻一闻茶香吧。", tasted: "微苦之后回甘，心里也安静下来。", verb: "喝一口" },
  coffee: { name: "热咖啡", detail: "手冲的香气，温热的杯沿", preparing: "热水缓缓落下，咖啡的香气飘过来了。", served: "刚冲好的咖啡，小心烫。", tasted: "热咖啡温暖了手心，世界可以再等一会儿。", verb: "喝一口" },
};

