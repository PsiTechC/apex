import { MongoClient } from "mongodb";
import { withCORS } from '../../../middleware/cors';

async function getControl() {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");

    const masterData = await db
      .collection("SEBI_CSCRF_MASTER_3")
      .find()
      .toArray();

    client.close();
    return new Response(JSON.stringify(masterData), { status: 200 });
  } catch (err) {
    console.error("Error fetching SEBI_CSCRF_MASTER data:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}
export const GET = withCORS(getControl);