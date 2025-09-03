// app/api/ciso/dashboard-overview/route.js
import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

const VALID_STATUSES = ["pending", "pending-approval", "partially-approved", "approved"];

async function dashboardOverview(req) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  let client;
  try {
    const { searchParams } = new URL(req.url);

    // Accept ?email=a@x.com,b@y.com OR ?email=a@x.com&email=b@y.com
    const emails = [...searchParams.getAll("email")]
      .flatMap(v => v.split(","))
      .map(v => v.trim())
      .filter(Boolean);

    client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("owner_evidence");

    const match = {
      status: { $in: VALID_STATUSES },
      ...(emails.length ? { owner: { $in: emails } } : {}),
    };

    const grouped = await collection
      .aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();

    // Ensure zeros for any missing statuses
    const counts = Object.fromEntries(VALID_STATUSES.map(s => [s, 0]));
    for (const { _id, count } of grouped) counts[_id] = count;

    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    return new Response(
      JSON.stringify({
        message: "Dashboard overview computed",
        owners: emails,     // echo for debugging
        counts,             // { pending, 'pending-approval', 'partially-approved', approved }
        total,
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
