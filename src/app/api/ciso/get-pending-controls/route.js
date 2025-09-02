import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function getPendingControls(req) {
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ message: "Method not allowed" }), {
        status: 405,
      });
    }

    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");

    if (!emailParam) {
      return new Response(JSON.stringify({ message: "Missing email" }), {
        status: 400,
      });
    }

    // Support multiple comma-separated emails
    const emails = emailParam.split(",").map((e) => e.trim());

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("owner_evidence");

    // Query controls with status "pending-approval" for any of the given emails
    const pendingControls = await collection
      .find({
        owner: { $in: emails },
        status: "pending-approval",
      })
      .project({
        _id: 0,
        controlId: 1,
        goal: 1,
        function: 1,
        description: 1,
        guidance: 1,
        status: 1,
        evidences: 1,
        owner: 1, // optionally include the owner
      })
      .toArray();

    await client.close();

    return new Response(
      JSON.stringify({
        emails,
        assignedControls: pendingControls,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error fetching pending controls:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

export const GET = withCORS(getPendingControls);
