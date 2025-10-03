import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

async function deleteUser(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ message: "Method not allowed" }), {
        status: 405,
      });
    }

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return new Response(JSON.stringify({ message: "Email is required" }), {
        status: 400,
      });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");

    const usersCollection = db.collection("users");
    const evidenceCollection = db.collection("owner_evidence");
    const mappingCollection = db.collection("ciso_owner_it_mapping");

    // 1. Delete user from users collection
    const userResult = await usersCollection.deleteOne({ email });

    // 2. Delete ALL evidence docs where owner = email
    const evidenceResult = await evidenceCollection.deleteMany({ owner: email });

    // 3. Remove the email from all members[] arrays in ciso_owner_it_mapping
    const mappingResult = await mappingCollection.updateMany(
      { members: email },
      { $pull: { members: email } }
    );

    await client.close();

    return new Response(
      JSON.stringify({
        message: "User and related data deleted successfully",
        deletedUserCount: userResult.deletedCount,
        deletedEvidenceCount: evidenceResult.deletedCount,
        updatedMappings: mappingResult.modifiedCount,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in delete-user route:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}

export const POST = withCORS(deleteUser);
