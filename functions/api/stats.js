import { json, requireAdmin } from "../_utils";

export async function onRequest({ request, env }) {
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  const [{ total_volunteers = 0, total_participations = 0, total_minutes = 0 } = {}] =
    (await env.DB.prepare(
      `SELECT
         COUNT(DISTINCT submissions.employee_id) AS total_volunteers,
         COUNT(submissions.id) AS total_participations,
         COALESCE(SUM(activities.duration_minutes), 0) AS total_minutes
       FROM submissions
       JOIN activities ON submissions.activity_id = activities.id`
    ).all()).results;

  const { results: perPerson } = await env.DB.prepare(
    `SELECT submissions.employee_id, submissions.name,
            SUM(activities.duration_minutes) AS total_minutes
     FROM submissions
     JOIN activities ON submissions.activity_id = activities.id
     GROUP BY submissions.employee_id, submissions.name
     ORDER BY total_minutes DESC`
  ).all();

  return json({
    totals: {
      volunteers: total_volunteers,
      participations: total_participations,
      minutes: total_minutes,
    },
    perPerson,
  });
}
