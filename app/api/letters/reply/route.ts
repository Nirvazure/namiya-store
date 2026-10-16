/** Retire the anonymous prototype endpoint: all letters now require a private thread. */
export async function POST() {
  return Response.json({ error: "请登录后通过小店投递信件。", replacement: "/api/threads" }, { status: 410 });
}
