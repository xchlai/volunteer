import { json, requireAdmin, parseJson } from "../../_utils";

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase();

  if (method === "POST") {
    const body = await parseJson(request);
    const rawActivityIds = Array.isArray(body?.activity_ids)
      ? body.activity_ids
      : body?.activity_id
        ? [body.activity_id]
        : [];

    if (!body?.employee_id || !body?.name || rawActivityIds.length === 0) {
      return json({ error: "Missing submission fields" }, { status: 400 });
    }

    const employeeId = body.employee_id.trim();
    const name = body.name.trim();
    const activityIds = [...new Set(rawActivityIds.map((id) => Number(id)))].filter(
      (id) => Number.isFinite(id)
    );

    if (!employeeId || !name || activityIds.length === 0) {
      return json({ error: "Invalid submission fields" }, { status: 400 });
    }

    const existing = await env.DB.prepare(
      "SELECT 1 FROM submissions WHERE employee_id = ? LIMIT 1"
    )
      .bind(employeeId)
      .first();

    const statements = [];
    if (existing) {
      statements.push(
        env.DB.prepare("DELETE FROM submissions WHERE employee_id = ?").bind(employeeId)
      );
    }

    activityIds.forEach((activityId) => {
      statements.push(
        env.DB.prepare(
          `INSERT INTO submissions (employee_id, name, activity_id, updated_at)
           VALUES (?, ?, ?, datetime('now'))`
        ).bind(employeeId, name, activityId)
      );
    });

    await env.DB.batch(statements);

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
