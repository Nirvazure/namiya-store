export type DayPhase = "morning" | "day" | "dusk" | "night";
export type WeatherCondition = "clear" | "cloudy" | "overcast" | "rain" | "snow" | "fog" | "storm" | "unknown";
export type WeatherSnapshot = {
  weatherCode: number;
  temperature: number;
  timezone: string;
  isDay: boolean;
  observedAt: number;
  fetchedAt: number;
  solarDays: { date: string; sunrise: number | null; sunset: number | null }[];
};
export type SceneEnvironment = {
  phase: DayPhase;
  condition: WeatherCondition;
  label: string;
  phaseLabel: string;
  weatherLabel: string;
  localTime: string;
  timeSource: "当地时间" | "本地时间";
  placeName?: string;
  temperature?: number;
  live: boolean;
};

export const WEATHER_REFRESH_MS = 15 * 60_000;
export const WEATHER_MAX_AGE_MS = 30 * 60_000;
const phaseLabels: Record<DayPhase, string> = { morning: "清晨", day: "白天", dusk: "黄昏", night: "夜晚" };

export function classifyWeather(code: number): { condition: WeatherCondition; label: string } {
  if (code === 0 || code === 1) return { condition: "clear", label: "晴" };
  if (code === 2) return { condition: "cloudy", label: "多云" };
  if (code === 3) return { condition: "overcast", label: "阴天" };
  if (code === 45 || code === 48) return { condition: "fog", label: "薄雾" };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { condition: "rain", label: [51, 56, 61, 80].includes(code) ? "小雨" : "雨" };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: "snow", label: "飘雪" };
  if ([95, 96, 97, 99].includes(code)) return { condition: "storm", label: "雷雨" };
  return { condition: "unknown", label: "天气暂缺" };
}

export function locationDate(now: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}

export function getSceneEnvironment(now: number, weather?: WeatherSnapshot): SceneEnvironment {
  const hour = new Date(now).getHours();
  const fallbackPhase: DayPhase = hour >= 5 && hour < 8 ? "morning" : hour >= 8 && hour < 17 ? "day" : hour >= 17 && hour < 19 ? "dusk" : "night";
  const clock = (timezone?: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const fallback: SceneEnvironment = { phase: fallbackPhase, phaseLabel: phaseLabels[fallbackPhase], condition: "unknown", label: `${phaseLabels[fallbackPhase]} · 本地时间`, weatherLabel: "天气暂不可用", localTime: clock(), timeSource: "本地时间", live: false };
  if (!weather || now - Math.min(weather.fetchedAt, weather.observedAt) >= WEATHER_MAX_AGE_MS) return fallback;
  const solar = weather.solarDays.find(day => day.date === locationDate(now, weather.timezone));
  if (!solar) return fallback;
  const { sunrise, sunset } = solar;
  let phase: DayPhase;
  if (weather.solarDays.some(day => day.sunrise !== null && now >= day.sunrise - 30 * 60_000 && now < day.sunrise + 60 * 60_000)) phase = "morning";
  else if (weather.solarDays.some(day => day.sunset !== null && now >= day.sunset - 60 * 60_000 && now < day.sunset + 30 * 60_000)) phase = "dusk";
  else if (sunrise === null || sunset === null) phase = weather.isDay ? "day" : "night";
  else phase = now >= sunrise && now < sunset ? "day" : "night";
  const condition = classifyWeather(weather.weatherCode);
  return { phase, phaseLabel: phaseLabels[phase], condition: condition.condition, label: `${phaseLabels[phase]} · ${condition.label}`, weatherLabel: condition.label, localTime: clock(weather.timezone), timeSource: "当地时间", temperature: weather.temperature, live: true };
}
