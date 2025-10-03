import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import { withCORS } from '../../../middleware/cors';

const ORG_KEYS = new Set([
  "RE_MII",
  "RE_QUALIFIED",
  "RE_MID_SIZED",
  "RE_SMALL_SIZED",
  "RE_SELF_CERT",
]);

async function getControls(req) {
  try {
    // 1) Resolve organizationType (query param wins; fallback to JWT cookie)
    const { searchParams } = new URL(req.url);
    let organizationType = searchParams.get("organizationType");

    if (!organizationType) {
      const cookieHeader = req.headers.get("cookie") || "";
      const token = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .map((c) => c.split("="))
        .reduce((acc, [k, ...v]) => ({ ...acc, [k]: v.join("=") }), {})?.token;

      if (token) {
        try {
          const decoded = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET);
          organizationType = decoded?.organizationType || null;
        } catch {
          /* ignore token errors */
        }
      }
    }

    if (!organizationType || !ORG_KEYS.has(organizationType)) {
      return new Response(
        JSON.stringify({
          message:
            "organizationType is required and must be one of RE_MII, RE_QUALIFIED, RE_MID_SIZED, RE_SMALL_SIZED, RE_SELF_CERT",
        }),
        { status: 400 }
      );
    }

    // 2) Filter: only controls where this org flag is "YES"
    const filter = { [organizationType]: "YES" };

    // 3) Query Mongo
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    const projection = {
      _id: 0,
      "CONTROL ID": 1,
      GOAL: 1,
      FUNCTION: 1,
      "CONTROL DESCRIPTION": 1,
      "COMPLIANCE GUIDANCE": 1,
      "SAMPLE EVIDANCES": 1, // single field in DB
    };

    const docs = await db
      .collection("SEBI_CSCRF_MASTER_3")
      .find(filter, { projection })
      .toArray();

    await client.close();

    // 4) Format response with only required fields
    const result = docs.map((d) => ({
      "CONTROL ID": d["CONTROL ID"],
      GOAL: d.GOAL,
      FUNCTION: d.FUNCTION,
      "CONTROL DESCRIPTION": d["CONTROL DESCRIPTION"],
      "COMPLIANCE GUIDANCE": d["COMPLIANCE GUIDANCE"],
      "SAMPLE EVIDENCE": d["SAMPLE EVIDANCES"] ?? "NA",
    }));

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    console.error("Error fetching filtered controls:", err);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const GET = withCORS(getControls);
