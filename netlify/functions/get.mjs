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
    // ── All periods + targets in one call (used by dashboard on load) ──
    if (action === "all") {
      const { blobs: rBlobs } = await store.list({ prefix: "report/" });
      const { blobs: tBlobs } = await store.list({ prefix: "targets/" });
      const periods = rBlobs
        .map((b) => b.key.replace("report/", ""))
        .filter((p) => !p.startsWith("__"))
        .sort();
      const [allRows, allTargets, meta] = await Promise.all([
        Promise.all(periods.map((p) =>
          store.get(`report/${p}`, { type: "json" })
            .then((rows) => ({ period: p, data: rows || [] }))
            .catch(() => ({ period: p, data: [] }))
        )),
        Promise.all(tBlobs.map((b) =>
          store.get(b.key, { type: "json" }).catch(() => null)
        )),
        store.get("meta", { type: "json" }).catch(() => null),
      ]);
      return Response.json({
        reports: allRows,
        targets: allTargets.filter(Boolean),
        meta: meta || {},
      }, { headers: cors });
    }

    // ── Get compact individual records for one period (stage movement) ──
    if (action === "records") {
      const period = url.searchParams.get("period");
      if (!period)
        return Response.json({ error: "Missing period" }, { status: 400, headers: cors });
      const rows = await store.get(`records/${period}`, { type: "json" }).catch(() => null);
      return Response.json({ rows: rows || [] }, { headers: cors });
    }

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
