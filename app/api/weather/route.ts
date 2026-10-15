import type { WeatherSnapshot } from "@/domain/weather";

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function coordinate(value: string | null, limit: number): number | null {
  if (value === null || !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const latitude = coordinate(params.get("latitude"), 90);
  const longitude = coordinate(params.get("longitude"), 180);
  if (latitude === null || longitude === null) return Response.json({ error: "Invalid coordinates." }, { status: 400 });

  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: "temperature_2m,weather_code,is_day", daily: "sunrise,sunset", timezone: "auto", timeformat: "unixtime", past_days: "1", forecast_days: "2" });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query}`, { signal: AbortSignal.timeout(8_000), cache: "no-store" });
    if (!response.ok) throw new Error("Weather provider unavailable.");
    const data = await response.json();
    const { current, daily, timezone, utc_offset_seconds: offset } = data;
    if (!current || !daily || typeof timezone !== "string" || !finite(offset)
      || !finite(current.time) || !finite(current.temperature_2m) || !Number.isInteger(current.weather_code)
      || ![0, 1].includes(current.is_day) || !Array.isArray(daily.time) || !daily.time.length
      || !Array.isArray(daily.sunrise) || !Array.isArray(daily.sunset)
      || daily.sunrise.length !== daily.time.length || daily.sunset.length !== daily.time.length) throw new Error("Invalid weather data.");
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    const solarDays = daily.time.map((time: unknown, index: number) => {
      const sunrise = daily.sunrise[index];
      const sunset = daily.sunset[index];
      if (!finite(time) || (sunrise !== null && !finite(sunrise)) || (sunset !== null && !finite(sunset))) throw new Error("Invalid solar data.");
      return { date: new Date((time + offset) * 1000).toISOString().slice(0, 10), sunrise: sunrise > 0 ? sunrise * 1000 : null, sunset: sunset > 0 ? sunset * 1000 : null };
    });
    const weather: WeatherSnapshot = { weatherCode: current.weather_code, temperature: current.temperature_2m, timezone, isDay: current.is_day === 1, observedAt: current.time * 1000, fetchedAt: Date.now(), solarDays };
    return Response.json(weather, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return Response.json({ error: "Weather temporarily unavailable." }, { status: timeout ? 504 : 502 });
  }
}
