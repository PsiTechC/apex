import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

export const dynamic = "force-dynamic";

async function submitHandler(req) {
  try {
    if (req.method && req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const testId = String(body.testId || "").trim(); // <- carry the batch id
    const responsesIn = Array.isArray(body.responses) ? body.responses : [];

    if (!email) {
      return new Response(JSON.stringify({ message: "email is required" }), { status: 400 });
    }
    if (responsesIn.length === 0) {
      return new Response(JSON.stringify({ message: "responses are required" }), { status: 400 });
    }

    // normalize responses
    const cleaned = responsesIn
      .map((r) => ({
        questionNumber: Number(r.questionNumber),
        selected: String(r.selected || "").toUpperCase(),
      }))
      .filter(
        (r) =>
          Number.isInteger(r.questionNumber) &&
          r.questionNumber > 0 &&
          ["A", "B", "C", "D"].includes(r.selected)
      );

    if (cleaned.length === 0) {
      return new Response(JSON.stringify({ message: "no valid responses" }), { status: 400 });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    // fetch correct answers for these question numbers
    const numbers = cleaned.map((r) => r.questionNumber);
    const qaDocs = await db
      .collection("cybersecurity_awareness_questions_full")
      .find(
        {
          $or: [
            { questionNumber: { $in: numbers } },
            { QuestionNumber: { $in: numbers } },
          ],
        },
        { projection: { questionNumber: 1, QuestionNumber: 1, "Correct Answer": 1 } }
      )
      .toArray();

    const correctMap = new Map(
      qaDocs.map((d) => {
        const n = Number(d.questionNumber ?? d.QuestionNumber);
        const corr = String(d["Correct Answer"] || "").toUpperCase();
        return [n, corr];
      })
    );

    const now = new Date();
    const results = cleaned.map((r) => {
      const correct = correctMap.get(r.questionNumber) || null;
      const isCorrect = correct ? r.selected === correct : null;
      return {
        questionNumber: r.questionNumber,
        selected: r.selected,
        isCorrect,
        answeredAt: now,
      };
    });

    const col = db.collection("questions_complete_record");

    // Upsert by email + testId (if provided). If no testId, use email only.
    const filter = { email, ...(testId ? { testId } : {}) };

    const updateRes = await col.updateOne(
      filter,
      {
        $set: {
          email,
          ...(testId ? { testId } : {}),
          questions: results,
          isSubmit: true,
          submittedAt: now,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );

    await client.close();

    return new Response(
      JSON.stringify({
        message: "responses saved",
        email,
        testId: testId || null,
        count: results.length,
        isSubmit: true,
        upserted: !!updateRes.upsertedId,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("training/submit error:", err);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const POST = withCORS(submitHandler);
