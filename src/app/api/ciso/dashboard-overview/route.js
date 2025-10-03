// app/api/ciso/dashboard-overview/route.js
import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

const VALID_STATUSES = ["pending", "pending-approval", "partially-approved", "approved"];
const ORG_TYPES = new Set(["RE_QUALIFIED", "RE_MID_SIZED", "RE_SMALL_SIZED", "RE_SELF_CERT"]);
const GOALS = ["ANTICIPATE", "WITHSTAND AND CONTAIN", "RECOVER", "EVOLVE"];

async function dashboardOverview(req) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  let client;
  try {
    const { searchParams } = new URL(req.url);

    const emails = [...searchParams.getAll("email")]
      .flatMap(v => v.split(","))
      .map(v => v.trim())
      .filter(Boolean);

    const organizationTypeRaw = (searchParams.get("organizationType") || "").trim();
    const organizationType = organizationTypeRaw ? organizationTypeRaw.toUpperCase() : "";

    if (organizationType && !ORG_TYPES.has(organizationType)) {
      return new Response(
        JSON.stringify({
          message: "Invalid organizationType",
          allowed: [...ORG_TYPES],
        }),
        { status: 400 }
      );
    }

    client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");

    // --------- Existing owner_evidence aggregation ----------
    const ownerEvidence = db.collection("owner_evidence");

    const match = {
      status: { $in: VALID_STATUSES },
      ...(emails.length ? { owner: { $in: emails } } : {}),
    };

    const grouped = await ownerEvidence
      .aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();

    const counts = Object.fromEntries(VALID_STATUSES.map(s => [s, 0]));
    for (const { _id, count } of grouped) counts[_id] = count;

    const total = Object.values(counts).reduce((a, b) => a + b, 0);


   let pendingOwnerEvidence = [];
    if (emails.length) {
      const pendingDocs = await ownerEvidence
        .find(
          { status: "pending", owner: { $in: emails } },
          { projection: { owner: 1, controlId: 1, evidences: 1, _id: 0 } }
        )
        .toArray();

      pendingOwnerEvidence = pendingDocs.map((d) => ({
        email: d.owner,
        controlId: d.controlId,
        evidenceName:
          Array.isArray(d.evidences) && d.evidences.length
            ? (typeof d.evidences[0]?.name === "string" ? d.evidences[0].name : null)
            : null,
      }));
    }
    // --------- New: count controls and goals by organizationType ----------
    let controlsTotalForOrgType = null;
    let goalCountsForOrganizationType = null;

    if (organizationType) {
      const controlsCol = db.collection("SEBI_CSCRF_MASTER_3");

      // Flag filter like { RE_MID_SIZED: /^yes$/i }
      const flagFilter = { [organizationType]: { $regex: /^yes$/i } };

      // Total controls for this org type
      controlsTotalForOrgType = await controlsCol.countDocuments(flagFilter);

      // Per-GOAL counts for this org type
      const rawGoalGroups = await controlsCol
        .aggregate([
          { $match: { ...flagFilter, GOAL: { $exists: true, $ne: null } } },
          { $group: { _id: "$GOAL", count: { $sum: 1 } } },
        ])
        .toArray();

      const base = Object.fromEntries(GOALS.map(g => [g, 0]));
      for (const { _id, count } of rawGoalGroups) {
        const key = (typeof _id === "string" ? _id : "").toUpperCase().trim();
        if (key) base[key] = (base[key] || 0) + count;
      }
      goalCountsForOrganizationType = base;
    }

    return new Response(
      JSON.stringify({
        message: "Dashboard overview computed",
        owners: emails,
        counts,
        total,
        organizationType: organizationType || null,
        totalControlsForOrganizationType: controlsTotalForOrgType, // null if not requested
        goalCountsForOrganizationType,         
        pendingOwnerEvidence,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error computing dashboard overview:", err);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  } finally {
    if (client) await client.close();
  }
}

export const GET = withCORS(dashboardOverview);
