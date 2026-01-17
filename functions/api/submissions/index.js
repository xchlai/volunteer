import { json, requireAdmin, parseJson, ensureSchema } from "../../_utils";

export async function onRequest({ request, env }) {
  const method = request.method.toUpperCase();

  if (method === "POST") {
    await ensureSchema(env);
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

    const submissionMode = body?.submission_mode === "append" ? "append" : "reset";
    const statements = [];

    if (submissionMode === "reset") {
      const existing = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM submissions WHERE employee_id = ?"
      ).bind(employeeId).first();

      if (existing?.total) {
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
    } else {
      statements.push(
        env.DB.prepare(
          "UPDATE submissions SET name = ?, updated_at = datetime('now') WHERE employee_id = ?"
        ).bind(name, employeeId)
      );
      activityIds.forEach((activityId) => {
        statements.push(
          env.DB.prepare(
            `INSERT INTO submissions (employee_id, name, activity_id, updated_at)
             VALUES (?, ?, ?, datetime('now'))
             ON CONFLICT(employee_id, activity_id) DO UPDATE SET
               name = excluded.name,
               updated_at = excluded.updated_at`
          ).bind(employeeId, name, activityId)
        );
      });
    }

    await env.DB.batch(statements);

    return json({ ok: true });
  }

  if (method === "GET") {
    await ensureSchema(env);
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
