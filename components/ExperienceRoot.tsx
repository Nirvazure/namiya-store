"use client";
import { usePathname } from "next/navigation";
import { NamiyaExperience } from "./NamiyaExperience";
import { shopIdFromPath } from "@/services/shops/navigation";

/** The root layout keeps account, navigation and companion state mounted across shops. */
export function ExperienceRoot() {
  const pathname = usePathname();
  const id = shopIdFromPath(pathname);
  return id === null ? null : <NamiyaExperience initialShopId={id} />;
}
