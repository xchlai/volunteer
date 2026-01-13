const json = (data, init = {}) => {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(data), { ...init, headers });
};

const getAdminPassword = (env) => env.ADMIN_PASSWORD || "";

const requireAdmin = async (request, env) => {
  const password = request.headers.get("X-Admin-Password");
  if (!password) {
    return { ok: false, response: json({ error: "Missing admin password" }, { status: 401 }) };
  }
  if (password !== getAdminPassword(env)) {
    return { ok: false, response: json({ error: "Invalid admin password" }, { status: 403 }) };
  }
  return { ok: true };
};

const parseJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const ensureSchema = async (env) => {
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id TEXT NOT NULL,
        name TEXT NOT NULL,
        activity_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
      )`
    ),
    env.DB.prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS submissions_employee_activity_unique
        ON submissions(employee_id, activity_id)`
    ),
  ]);
};

export { json, requireAdmin, parseJson, ensureSchema };
