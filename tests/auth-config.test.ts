import { afterEach, expect, it, vi } from "vitest";
import { authConfig } from "@/lib/supabase/config";

afterEach(() => vi.unstubAllEnvs());

it("loads the shared URL and publishable key without database or admin credentials", () => {
  vi.stubEnv("SUPABASE_URL", " https://auth.example.supabase.co ");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", " sb_publishable_test ");
  vi.stubEnv("DATABASE_URL", undefined);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", undefined);
  expect(authConfig()).toEqual({ url: "https://auth.example.supabase.co", key: "sb_publishable_test" });
});

it.each([undefined, "", "   "])("keeps public browsing available when the publishable key is missing: %s", key => {
  vi.stubEnv("SUPABASE_URL", "https://auth.example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", key);
  expect(authConfig()).toBeNull();
});

it("treats a missing shared URL as unconfigured", () => {
  vi.stubEnv("SUPABASE_URL", undefined);
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  expect(authConfig()).toBeNull();
});
