import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function getOwnerControls(req) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return new Response(JSON.stringify({ message: "Missing email parameter" }), {
        status: 400,
      });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const docs = await db
      .collection("owner_evidence")
      .find({ owner: email })
      .project({ controlId: 1, evidences: 1, _id: 0 })
      .toArray();

    client.close();

    const controls = docs.map(doc => ({
      controlId: doc.controlId,
      evidences: (doc.evidences || []).map(ev => ({
        name: ev.name,
        frequency: ev.frequency || "",
      })),
    }));
    
    return new Response(JSON.stringify({ controls }), { status: 200 });

  } catch (err) {
    console.error("Error fetching owner control data:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

export const GET = withCORS(getOwnerControls);
