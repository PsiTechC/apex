
import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors"; 

async function getQuestions(req) {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db(); // defaults to DB in your URI

    // Fetch all questions
    const questions = await db
      .collection("cybersecurity_awareness_questions_full")
      .find({})
      .project({ _id: 0 }) // remove MongoDB _id if not needed
      .toArray();

    await client.close();

    return new Response(JSON.stringify(questions), { status: 200 });
  } catch (err) {
    console.error("Error fetching questions:", err);
    return new Response(
      JSON.stringify({ message: "Server error" }),
      { status: 500 }
    );
  }
}

export const GET = withCORS(getQuestions); 
