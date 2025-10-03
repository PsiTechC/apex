import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function getOwners(req) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      return new Response(JSON.stringify({ message: "Missing email parameter" }), { status: 400 });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");

    const mapping = await db.collection("ciso_owner_it_mapping").findOne({ ciso_email: email });

    client.close();

    return new Response(
      JSON.stringify({ members: mapping?.members || [] }),
      { status: 200 }
    );

  } catch (err) {
    console.error("Error fetching mapped members:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const GET = withCORS(getOwners);
