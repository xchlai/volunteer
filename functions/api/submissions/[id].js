import { json, requireAdmin } from "../../_utils";

export async function onRequest({ request, env, params }) {
  const method = request.method.toUpperCase();
  if (method !== "DELETE") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return json({ error: "Invalid submission id" }, { status: 400 });
  }

  await env.DB.prepare("DELETE FROM submissions WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
