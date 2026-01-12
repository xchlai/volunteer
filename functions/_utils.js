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

export { json, requireAdmin, parseJson };
