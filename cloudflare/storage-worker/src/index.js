const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }
    if (url.pathname !== "/internal/d1/query" || request.method !== "POST") {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    const supplied = request.headers.get("authorization") ?? "";
    if (!env.STORAGE_SHARED_SECRET || supplied !== `Bearer ${env.STORAGE_SHARED_SECRET}`) {
      return Response.json({ error: "Not authorized." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.sql !== "string" || !Array.isArray(body.params)) {
      return Response.json({ error: "Invalid query." }, { status: 400 });
    }

    try {
      const statement = env.DB.prepare(body.sql).bind(...body.params);
      const result = /^\s*(select|pragma)\b/i.test(body.sql)
        ? await statement.all()
        : await statement.run();
      return Response.json({ success: true, results: result.results ?? [], meta: result.meta ?? {} });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "D1 query failed." },
        { status: 500 },
      );
    }
  },
};

export default worker;
