import { getStore } from "@netlify/blobs";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function unauth() {
  return Response.json({ error: "Unauthorized" }, { status: 401, headers: cors });
}

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // ── Auth check ─────────────────────────────────────────────────
  const adminPwd = process.env.ADMIN_PASSWORD;
  if (!adminPwd) {
    console.error("ADMIN_PASSWORD env var not set");
    return Response.json({ error: "Server misconfigured" }, { status: 500, headers: cors });
  }
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token !== adminPwd) return unauth();

  // ── Auth ping (login verification only — no data written) ─
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "ping") {
    return Response.json({ ok: true }, { headers: cors });
  }

  const store = getStore("smib");

  try {
    const body = await req.json();

    // ── Upload one period's aggregated rows ───────────────────────
    if (action === "upload-period") {
      const { period, rows, records } = body;
      if (!period || !Array.isArray(rows))
        return Response.json({ error: "Missing period or rows" }, { status: 400, headers: cors });
      await store.setJSON(`report/${period}`, rows);
      if (Array.isArray(records) && records.length)
        await store.setJSON(`records/${period}`, records);
      await store.setJSON("meta", {
        lastUpload: new Date().toISOString(),
        lastPeriod: period,
      });
      return Response.json({ ok: true, period, count: rows.length, recs: records?.length || 0 }, { headers: cors });
    }

    // ── Delete a period ───────────────────────────────────────────
    if (action === "delete-period") {
      const { period } = body;
      if (!period)
        return Response.json({ error: "Missing period" }, { status: 400, headers: cors });
      await Promise.all([
        store.delete(`report/${period}`),
        store.delete(`records/${period}`).catch(() => {}),
      ]);
      return Response.json({ ok: true }, { headers: cors });
    }

    // ── Upload targets for a year ─────────────────────────────────
    if (action === "upload-targets") {
      const { year, data, uploadedAt } = body;
      if (!year || !data)
        return Response.json({ error: "Missing year or data" }, { status: 400, headers: cors });
      await store.setJSON(`targets/${year}`, { year, data, uploadedAt });
      return Response.json({ ok: true }, { headers: cors });
    }

    // ── Delete targets for a year ─────────────────────────────────
    if (action === "delete-targets") {
      const { year } = body;
      if (!year)
        return Response.json({ error: "Missing year" }, { status: 400, headers: cors });
      await store.delete(`targets/${year}`);
      return Response.json({ ok: true }, { headers: cors });
    }

    return Response.json({ error: "Unknown action" }, { status: 400, headers: cors });
  } catch (e) {
    console.error("ADMIN error:", e);
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
};
