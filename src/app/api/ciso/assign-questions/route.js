import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";
import { question_broadcast } from "../../../../../lib/question_broadcast";
import { randomUUID } from "crypto";  

export const dynamic = "force-dynamic";

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function parseQuestions(raw) {
  if (!raw) return [];
  let arr = [];
  const s = String(raw).trim();
  if (s.startsWith("[") && s.endsWith("]")) {
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) arr = j;
    } catch {}
  }
  if (arr.length === 0) arr = s.split(/[^0-9]+/).filter(Boolean);
  return Array.from(
    new Set(
      arr.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    )
  );
}

async function uploadEmails(req) {
  try {
    const ct = req.headers.get("content-type") || "";
    let ownerEmail = "";
    let csvText = "";
    let questionNumbers = [];

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      ownerEmail = String(form.get("email") || "").trim();
      const file = form.get("file") || form.get("csv");
      if (!file) {
        return new Response(
          JSON.stringify({ message: "CSV file is required (field name: file)" }),
          { status: 400 }
        );
      }
      csvText = await file.text();
      questionNumbers = parseQuestions(form.get("questions"));
    } else {
      const body = await req.json().catch(() => ({}));
      ownerEmail = String(body.email || "").trim();
      csvText = String(body.csv || "");
      questionNumbers = parseQuestions(body.questions);
    }

    if (!ownerEmail) {
      return new Response(JSON.stringify({ message: "Payload 'email' is required." }), { status: 400 });
    }
    if (!csvText) {
      return new Response(JSON.stringify({ message: "CSV content is empty." }), { status: 400 });
    }

    // Extract emails from CSV (dedup + lower-case)
    const found = csvText.match(EMAIL_REGEX) || [];
    const emails = Array.from(new Set(found.map((e) => e.toLowerCase())));
    if (emails.length === 0) {
      return new Response(JSON.stringify({ message: "No valid email addresses found in CSV." }), { status: 400 });
    }


    const testId = randomUUID();

    // ── DB: create a NEW document for each upload ─────────────────────────────
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();
    const col = db.collection("questions_track_record");

    const now = new Date();
    const docToInsert = {
      testId,
      email: ownerEmail,        // owner / CISO email
      members: emails,          // the recipients parsed from CSV
      questions: questionNumbers, // the question numbers selected (may be empty)
      createdAt: now,
      updatedAt: now,
    };

    const insertRes = await col.insertOne(docToInsert);

    await client.close();

    // ── Fire-and-forget mail broadcast (doesn't delay the response) ───────────
    try {
      setTimeout(() => {
        Promise.resolve(question_broadcast(emails, questionNumbers, testId))
          .catch((err) => console.error("question_broadcast error:", err));
      }, 0);
    } catch (e) {
      console.error("Failed to schedule question_broadcast:", e);
    }

    // Respond with this batch info
    return new Response(
      JSON.stringify({
        message: "Processed successfully.",
        ownerEmail,
        // testId,
        batchId: insertRes.insertedId?.toString?.() || null,
        addedEmailsCount: emails.length,
        addedQuestionsCount: questionNumbers.length,
        totals: {
          members: emails.length,
          questions: questionNumbers.length,
        },
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("assign-questions error:", err);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const POST = withCORS(uploadEmails);
