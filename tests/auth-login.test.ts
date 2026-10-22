import { beforeEach, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signInWithOAuth: auth.signIn } }) }));
import { GET } from "@/app/auth/login/route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.signIn.mockResolvedValue({ data: { url: "https://auth.example/authorize" }, error: null });
});

it.each(["http://localhost:3000", "https://preview.example", "https://namiya.example"])("keeps OAuth on the current origin %s without site configuration", async origin => {
  const response = await GET(new Request(`${origin}/auth/login?next=%2Fshop%2Fmine%3Ffrom%3Dlogin`));
  const callback = new URL(auth.signIn.mock.calls[0]![0].options.redirectTo);
  expect(callback.origin).toBe(origin);
  expect(callback.pathname).toBe("/auth/callback");
  expect(callback.searchParams.get("next")).toBe("/shop/mine?from=login");
  expect(response.headers.get("location")).toBe("https://auth.example/authorize");
});

it("rejects an external return destination when constructing the current-origin callback", async () => {
  await GET(new Request("https://preview.example/auth/login?next=%2F%2Fevil.example"));
  const callback = new URL(auth.signIn.mock.calls[0]![0].options.redirectTo);
  expect(callback.origin).toBe("https://preview.example");
  expect(callback.searchParams.get("next")).toBe("/");
});
