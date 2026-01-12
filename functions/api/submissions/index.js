import { json, requireAdmin, parseJson } from "../../_utils";

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase();

  if (method === "POST") {
    const body = await parseJson(request);
    if (!body?.employee_id || !body?.name || !body?.activity_id) {
      return json({ error: "Missing submission fields" }, { status: 400 });
    }

    const employeeId = body.employee_id.trim();
    const name = body.name.trim();
    const activityId = Number(body.activity_id);

    if (!employeeId || !name || !Number.isFinite(activityId)) {
      return json({ error: "Invalid submission fields" }, { status: 400 });
    }

    await env.DB.prepare(
      `INSERT INTO submissions (employee_id, name, activity_id, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(employee_id, activity_id)
       DO UPDATE SET name = excluded.name, updated_at = datetime('now')`
    ).bind(employeeId, name, activityId).run();

    return json({ ok: true });
  }

  if (method === "GET") {
    const auth = await requireAdmin(request, env);
    if (!auth.ok) return auth.response;

    const { results } = await env.DB.prepare(
      `SELECT submissions.id, submissions.employee_id, submissions.name,
              submissions.activity_id, activities.name AS activity_name,
              activities.duration_minutes, submissions.updated_at
       FROM submissions
       JOIN activities ON submissions.activity_id = activities.id
       ORDER BY submissions.updated_at DESC`
    ).all();

    return json({ submissions: results });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
