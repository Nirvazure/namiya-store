"use client";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { NamiyaExperience } from "./NamiyaExperience";
import { isDecorationPath, shopIdFromPath } from "@/services/shops/navigation";
import { installNavigationGuard } from "@/services/shops/navigationGuard";

/** The root layout keeps account, navigation and companion state mounted across shops. */
export function ExperienceRoot() {
  useLayoutEffect(installNavigationGuard, []);
  const pathname = usePathname();
  const id = shopIdFromPath(pathname);
  return id === null ? null : <NamiyaExperience initialShopId={id} decorating={isDecorationPath(pathname)} />;
}
