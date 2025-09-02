import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

export const dynamic = "force-dynamic";

async function getQuestions(req) {
  let client;
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ message: "email is required" }), {
        status: 400,
      });
    }

    client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    // 1) Look up assigned question numbers and submission status
    const track = await db.collection("questions_complete_record").findOne(
      { email },
      { projection: { _id: 0, questions: 1, isSubmit: 1 } }
    );

    if (!track) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // ✅ If already submitted, short-circuit
    if (track.isSubmit) {
      return new Response(
        JSON.stringify({ message: "Response already submitted" }),
        { status: 200 }
      );
    }

    const numbers = Array.isArray(track?.questions)
      ? track.questions.filter((n) => Number.isInteger(n) && n > 0)
      : [];

    if (numbers.length === 0) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // 2) Fetch questions by either QuestionNumber or questionNumber
    const filter = {
      $or: [
        { QuestionNumber: { $in: numbers } },
        { questionNumber: { $in: numbers } },
      ],
    };

    const docs = await db
      .collection("cybersecurity_awareness_questions_full")
      .find(filter, {
        projection: {
          _id: 0,
          Question: 1,
          question: 1,
          "Option A": 1,
          "Option B": 1,
          "Option C": 1,
          "Option D": 1,
          QuestionNumber: 1,
          questionNumber: 1,
        },
      })
      .toArray();

    // 3) Sort to match the assigned order
    const order = new Map(numbers.map((n, i) => [n, i]));
    docs.sort((a, b) => {
      const na = a.QuestionNumber ?? a.questionNumber ?? 0;
      const nb = b.QuestionNumber ?? b.questionNumber ?? 0;
      return (order.get(na) ?? 0) - (order.get(nb) ?? 0);
    });

    // 4) Normalize response
    const result = docs.map((d) => ({
      question: d.Question ?? d.question ?? "",
      options: {
        A: d["Option A"] ?? "",
        B: d["Option B"] ?? "",
        C: d["Option C"] ?? "",
        D: d["Option D"] ?? "",
      },
    }));

    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    console.error("get-questions error:", err);
    return new Response(JSON.stringify({ message: "Server error" }), {
      status: 500,
    });
  } finally {
    if (client) await client.close();
  }
}

export const GET = withCORS(getQuestions);
