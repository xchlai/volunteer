import { json, requireAdmin, parseJson, ensureSchema } from "../../_utils";

export async function onRequest({ request, env, params }) {
  const method = request.method.toUpperCase();
  const id = Number(params.id);

  if (!Number.isFinite(id)) {
    return json({ error: "Invalid activity id" }, { status: 400 });
  }

  if (method === "PUT") {
    await ensureSchema(env);
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return auth.response;

    const body = await parseJson(request);
    if (!body?.name || !body?.duration_minutes) {
      return json({ error: "Missing activity name or duration" }, { status: 400 });
    }

    await env.DB.prepare(
      "UPDATE activities SET name = ?, duration_minutes = ? WHERE id = ?"
    ).bind(body.name.trim(), Number(body.duration_minutes), id).run();

    return json({ ok: true });
  }

  if (method === "DELETE") {
    await ensureSchema(env);
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return auth.response;

    await env.DB.prepare("DELETE FROM activities WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
