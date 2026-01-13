import { json, requireAdmin } from "../_utils";

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase();
  if (method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  await env.DB.batch([
    env.DB.prepare("DELETE FROM submissions"),
    env.DB.prepare("DELETE FROM activities"),
  ]);

  return json({ ok: true });
}
