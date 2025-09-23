import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function getUsers(request) {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");

    const users = await db
      .collection("users")
      .find({ role: "ciso" })
      .project({ password: 0 })
      .toArray();

    client.close();
    return new Response(JSON.stringify(users), { status: 200 });
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const GET = withCORS(getUsers);
