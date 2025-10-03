import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function getAssignedControls(req) {
  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ message: "Method not allowed" }), {
        status: 405,
      });
    }

    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return new Response(JSON.stringify({ message: "Missing email parameter" }), {
        status: 400,
      });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const collection = db.collection("owner_evidence");

    const records = await collection
      .find({ owner: email })
      .sort({ timestamp: -1 })
      .toArray();

    await client.close();

    return new Response(JSON.stringify({ assignedControls: records }), {
      status: 200,
    });
  } catch (err) {
    console.error("❌ Error in get-assigned-controls:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

export const GET = withCORS(getAssignedControls);
