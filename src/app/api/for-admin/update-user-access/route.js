import { MongoClient } from "mongodb";
import { withCORS } from '../../../middleware/cors';

async function controlAccess(req) {
  try {
    const { email, status } = await req.json();

    if (!email || !["granted", "restricted"].includes(status)) {
      return new Response(JSON.stringify({ message: "Invalid input" }), { status: 400 });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");

    const result = await db.collection("users").updateOne(
      { email },
      { $set: { status } }
    );

    client.close();

    if (result.modifiedCount === 0) {
      return new Response(JSON.stringify({ message: "User not found or not updated" }), { status: 404 });
    }

    return new Response(JSON.stringify({ message: `User access ${status}` }), { status: 200 });
  } catch (err) {
    console.error("Access update error:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}
export const POST = withCORS(controlAccess);