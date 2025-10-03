// /app/api/for-admin/add-control/route.js
import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

// Allowed enums (kept tight to avoid junk data)
const YES_NO = new Set(["YES", "NO"]);
const BEGIN_END = new Set(["B", "E"]);

/**
 * Normalize and validate the incoming payload.
 * Expects keys exactly as used in your modal's onSave payload.
 */
function validateAndBuildDoc(body) {
  const required = [
    "CONTROL ID",
    "FINANCIAL YEAR",
    "GOAL",
    "FUNCTION",
    "CONTROL DESCRIPTION",
  ];

  for (const k of required) {
    if (!body?.[k] || String(body[k]).trim() === "") {
      return { error: `Missing required field: ${k}` };
    }
  }

  // Optional fields (default to empty string if not provided)
  const safe = (v) => (v === undefined || v === null ? "" : String(v));

  // Normalize some fields
  const freq = safe(body.FREQUENCY);
  const begEnd = safe(body.BEGINNING_END_INDICATOR || body.BEGINNING_END || body["BEGINNING_END"])
    .toUpperCase();
  const re_mii = safe(body.RE_MII).toUpperCase() || "NO";
  const re_qualified = safe(body.RE_QUALIFIED).toUpperCase() || "NO";
  const re_mid = safe(body.RE_MID_SIZED).toUpperCase() || "NO";
  const re_small = safe(body.RE_SMALL_SIZED).toUpperCase() || "NO";
  const re_self = safe(body.RE_SELF_CERT).toUpperCase() || "NO";
  const status = safe(body["CONTROL STATUS"]).toUpperCase() || "A";

  if (begEnd && !BEGIN_END.has(begEnd)) {
    return { error: "BEGINNING_END_INDICATOR must be 'B' or 'E'" };
  }
  for (const [label, val] of [
    ["RE_MII", re_mii],
    ["RE_QUALIFIED", re_qualified],
    ["RE_MID_SIZED", re_mid],
    ["RE_SMALL_SIZED", re_small],
    ["RE_SELF_CERT", re_self],
  ]) {
    if (val && !YES_NO.has(val)) {
      return { error: `${label} must be 'YES' or 'NO'` };
    }
  }

  // Build the exact document you’ve been using everywhere
  const doc = {
    "CONTROL ID": String(body["CONTROL ID"]).trim(),
    "FINANCIAL YEAR": String(body["FINANCIAL YEAR"]).trim(),
    GOAL: String(body.GOAL).trim(),
    FUNCTION: String(body.FUNCTION).trim(),
    GUIDELINE: safe(body.GUIDELINE),
    STANDARD: safe(body.STANDARD),
    "CONTROL DESCRIPTION": safe(body["CONTROL DESCRIPTION"]),
    "COMPLIANCE GUIDANCE": safe(body["COMPLIANCE GUIDANCE"]),
    "SAMPLE EVIDANCES": safe(body["SAMPLE EVIDANCES"]),
    FREQUENCY: freq,
    BEGINNING_END_INDICATOR: begEnd || "B",
    RE_MII: re_mii || "NO",
    RE_QUALIFIED: re_qualified || "NO",
    RE_MID_SIZED: re_mid || "NO",
    RE_SMALL_SIZED: re_small || "NO",
    RE_SELF_CERT: re_self || "NO",
    "CONTROL STATUS": status,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return { doc };
}

async function addControl(req) {
  try {
    const body = await req.json();
    const { error, doc } = validateAndBuildDoc(body);
    if (error) {
      return new Response(JSON.stringify({ message: error }), { status: 400 });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("SEBI_CSCRF_MASTER_3");

    // Prevent duplicate Control IDs for the same year
    const exists = await collection.findOne({
      "CONTROL ID": doc["CONTROL ID"],
      "FINANCIAL YEAR": doc["FINANCIAL YEAR"],
    });

    if (exists) {
      await client.close();
      return new Response(
        JSON.stringify({ message: "Control already exists for this year (duplicate CONTROL ID + FINANCIAL YEAR)" }),
        { status: 409 }
      );
    }

    const result = await collection.insertOne(doc);
    await client.close();

    return new Response(
      JSON.stringify({ message: "Control added successfully", id: result.insertedId }),
      { status: 201 }
    );
  } catch (err) {
    console.error("Error adding control:", err);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const POST = withCORS(addControl);
