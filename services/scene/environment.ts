import { getSceneEnvironment, WEATHER_REFRESH_MS, type SceneEnvironment, type WeatherSnapshot } from "@/domain/weather";
import { parsePlaceName } from "@/domain/place";
import type { SceneLocation } from "@/domain/sceneLocation";

type Coordinates = { latitude: number; longitude: number };

export function locatePosition(geolocation: Geolocation | null = navigator.geolocation): Promise<Coordinates | undefined> {
  return new Promise(resolve => {
    if (!geolocation) { resolve(undefined); return; }
    try {
      geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          resolve(Number.isFinite(latitude) && Math.abs(latitude) <= 90 && Number.isFinite(longitude) && Math.abs(longitude) <= 180 ? { latitude, longitude } : undefined);
        },
        () => resolve(undefined),
        { enableHighAccuracy: false, timeout: 8_000, maximumAge: 15 * 60_000 },
      );
    } catch { resolve(undefined); }
  });
}

// The subscription owns all timers and requests; location is shared across React effect restarts.
export function watchSceneEnvironment(update: (state: SceneEnvironment) => void, location: Promise<SceneLocation | undefined>): () => void {
  let alive = true;
  let coordinates: Coordinates | undefined;
  let weather: WeatherSnapshot | undefined;
  let nextRefresh = 0;
  let request: AbortController | undefined;
  let placeRequest: AbortController | undefined;
  let placeStarted = false;
  let placeName: string | undefined;
  let timezone: string | undefined;
  const publish = () => { if (alive) update({ ...getSceneEnvironment(Date.now(), weather, timezone), placeName }); };

  async function resolvePlace() {
    if (!alive || !coordinates || placeStarted || document.visibilityState === "hidden") return;
    placeStarted = true;
    const controller = new AbortController();
    placeRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      // Direct browser request with consented GPS only. Omitting coordinates would enable IP lookup.
      const params = new URLSearchParams({ latitude: String(coordinates.latitude), longitude: String(coordinates.longitude), localityLanguage: "zh" });
      const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`, { signal: controller.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok) throw new Error("Place unavailable.");
      const name = parsePlaceName(await response.json());
      if (alive && !controller.signal.aborted) placeName = name;
    } catch {
      // Place lookup must never delay or discard weather.
    } finally {
      clearTimeout(timeout);
      placeRequest = undefined;
      publish();
    }
  }

  async function refresh() {
    if (!alive || !coordinates || request || document.visibilityState === "hidden" || Date.now() < nextRefresh) return;
    nextRefresh = Date.now() + WEATHER_REFRESH_MS;
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const params = new URLSearchParams({ latitude: String(coordinates.latitude), longitude: String(coordinates.longitude) });
      const response = await fetch(`/api/weather?${params}`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Weather unavailable.");
      const candidate: WeatherSnapshot = await response.json();
      getSceneEnvironment(Date.now(), candidate);
      if (alive && !controller.signal.aborted) weather = candidate;
    } catch {
      // Keep recent observations; getSceneEnvironment expires them independently of retries.
    } finally {
      clearTimeout(timeout);
      request = undefined;
      publish();
    }
  }

  function tick() {
    if (document.visibilityState === "hidden") return;
    publish();
    void refresh();
    void resolvePlace();
  }

  publish();
  void location.then(result => {
    if (alive) {
      coordinates = result;
      placeName = result?.placeName;
      timezone = result?.timezone;
      placeStarted = Boolean(placeName);
      tick();
    }
  });
  const timer = setInterval(tick, 60_000);
  document.addEventListener("visibilitychange", tick);
  return () => {
    alive = false;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", tick);
    request?.abort();
    placeRequest?.abort();
  };
}
