"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneEnvironment } from "@/domain/weather";
import { locatePosition, watchSceneEnvironment } from "@/services/scene/environment";
import { fixedShopLocation } from "@/domain/sceneLocation";
import type { Shop } from "@/domain/shops";

export function useSceneEnvironment(shop: Pick<Shop, "id" | "kind">): SceneEnvironment | undefined {
  const [environment, setEnvironment] = useState<SceneEnvironment>();
  const location = useRef<ReturnType<typeof locatePosition> | undefined>(undefined);
  const fixedLocation = fixedShopLocation(shop);
  useEffect(() => {
    if (fixedLocation) return watchSceneEnvironment(setEnvironment, Promise.resolve(fixedLocation));
    location.current ??= locatePosition();
    return watchSceneEnvironment(setEnvironment, location.current);
  }, [fixedLocation]);
  return environment;
}
