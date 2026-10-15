"use client";

import { useEffect, useRef, useState } from "react";
import type { SceneEnvironment } from "@/domain/weather";
import { locatePosition, watchSceneEnvironment } from "@/services/scene/environment";

export function useSceneEnvironment(): SceneEnvironment | undefined {
  const [environment, setEnvironment] = useState<SceneEnvironment>();
  const location = useRef<ReturnType<typeof locatePosition> | undefined>(undefined);
  useEffect(() => {
    location.current ??= locatePosition();
    return watchSceneEnvironment(setEnvironment, location.current);
  }, []);
  return environment;
}
