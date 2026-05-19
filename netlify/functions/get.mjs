import { getStore } from "@netlify/blobs";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

export default async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const store = getStore("smib");

  try {
    // ── List available report periods ─────────────────────────────
    if (action === "periods") {
      const { blobs } = await store.list({ prefix: "report/" });
      const periods = blobs
        .map((b) => b.key.replace("report/", ""))
        .filter((p) => !p.startsWith("__"))
        .sort();
      const meta = await store.get("meta", { type: "json" }).catch(() => null);
      return Response.json({ periods, meta: meta || {} }, { headers: cors });
    }

    // ── Get aggregated rows for one period ────────────────────────
    if (action === "data") {
      const period = url.searchParams.get("period");
      if (!period)
        return Response.json({ error: "Missing period" }, { status: 400, headers: cors });
      const rows = await store.get(`report/${period}`, { type: "json" }).catch(() => null);
      return Response.json({ rows: rows || [] }, { headers: cors });
    }

    // ── Get all branch NPL targets ────────────────────────────────
    if (action === "targets") {
      const { blobs } = await store.list({ prefix: "targets/" });
      const all = await Promise.all(
        blobs.map((b) => store.get(b.key, { type: "json" }).catch(() => null))
      );
      return Response.json({ targets: all.filter(Boolean) }, { headers: cors });
    }

    return Response.json({ error: "Unknown action" }, { status: 400, headers: cors });
  } catch (e) {
    console.error("GET error:", e);
    return Response.json({ error: e.message }, { status: 500, headers: cors });
  }
};
