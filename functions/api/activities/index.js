import { json, requireAdmin, parseJson } from "../../_utils";

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase();

  if (method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT id, name, duration_minutes FROM activities ORDER BY id DESC"
    ).all();
    return json({ activities: results });
  }

  if (method === "POST") {
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return auth.response;

    const body = await parseJson(request);
    if (!body?.name || !body?.duration_minutes) {
      return json({ error: "Missing activity name or duration" }, { status: 400 });
    }

    await env.DB.prepare(
      "INSERT INTO activities (name, duration_minutes) VALUES (?, ?)"
    ).bind(body.name.trim(), Number(body.duration_minutes)).run();

    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
