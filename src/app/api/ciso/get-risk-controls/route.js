import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function getRiskControl(req) {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // Collect emails from repeated params and/or comma-separated single param
    const emails =
      [...searchParams.getAll("email")]
        .flatMap(v => v.split(","))       // support "a,b,c"
        .map(v => v.trim())
        .filter(Boolean);

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("owner_evidence");

    const query = { status: "risk" };
    if (emails.length) {
      query.owner = { $in: emails };
    }

    const controls = await collection
      .find(query, {
        projection: {
          _id: 0,
          controlId: 1,
          goal: 1,
          function: 1,
          description: 1,
          guidance: 1,
          evidences: 1,
          owner: 1,
          status: 1,
          timestamp: 1,
          comment: 1,
        },
      })
      .sort({ controlId: 1 })
      .toArray();

    await client.close();

    return new Response(
      JSON.stringify({
        message: "Risk controls fetched successfully",
        owners: emails,              // helpful for debugging
        assignedControls: controls,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error fetching risk controls:", err);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const GET = withCORS(getRiskControl);
