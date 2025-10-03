import { MongoClient } from "mongodb";
import { withCORS } from '../../middleware/cors';

async function getControls(req) {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");

    const masterData = await db
      .collection("SEBI_CSCRF_MASTER")
      .find(
        {}, // no filter
        {
          projection: {
            _id: 0,
            "CONTROL ID": 1,
            "FINANCIAL YEAR": 1,
            GOAL: 1,
            FUNCTION: 1,
            "CONTROL DESCRIPTION": 1,
            "COMPLIANCE GUIDANCE": 1,
          },
        }
      )
      .toArray();

    client.close();
    return new Response(JSON.stringify(masterData), { status: 200 });
  } catch (err) {
    console.error("Error fetching SEBI_CSCRF_MASTER data:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  }
}
export const GET = withCORS(getControls);