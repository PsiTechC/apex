// import { MongoClient } from "mongodb";
// import { withCORS } from "../../../middleware/cors";

// export const dynamic = "force-dynamic";

// async function getQuestions(req) {
//   let client;
//   try {
//     const { searchParams } = new URL(req.url);
//     const email = (searchParams.get("email") || "").trim().toLowerCase();

//     if (!email) {
//       return new Response(JSON.stringify({ message: "email is required" }), {
//         status: 400,
//       });
//     }

//     client = await MongoClient.connect(process.env.MONGO_URI);
//     const db = client.db();

//     // 1) Look up assigned question numbers and submission status
//     const track = await db.collection("questions_complete_record").findOne(
//       { email },
//       { projection: { _id: 0, questions: 1, isSubmit: 1 } }
//     );

//     if (!track) {
//       return new Response(JSON.stringify([]), { status: 200 });
//     }

//     // ✅ If already submitted, short-circuit
//     if (track.isSubmit) {
//       return new Response(
//         JSON.stringify({ message: "Response already submitted" }),
//         { status: 200 }
//       );
//     }

//     const numbers = Array.isArray(track?.questions)
//       ? track.questions.filter((n) => Number.isInteger(n) && n > 0)
//       : [];

//     if (numbers.length === 0) {
//       return new Response(JSON.stringify([]), { status: 200 });
//     }

//     // 2) Fetch questions by either QuestionNumber or questionNumber
//     const filter = {
//       $or: [
//         { QuestionNumber: { $in: numbers } },
//         { questionNumber: { $in: numbers } },
//       ],
//     };

//     const docs = await db
//       .collection("cybersecurity_awareness_questions_full")
//       .find(filter, {
//         projection: {
//           _id: 0,
//           Question: 1,
//           question: 1,
//           "Option A": 1,
//           "Option B": 1,
//           "Option C": 1,
//           "Option D": 1,
//           QuestionNumber: 1,
//           questionNumber: 1,
//         },
//       })
//       .toArray();

//     // 3) Sort to match the assigned order
//     const order = new Map(numbers.map((n, i) => [n, i]));
//     docs.sort((a, b) => {
//       const na = a.QuestionNumber ?? a.questionNumber ?? 0;
//       const nb = b.QuestionNumber ?? b.questionNumber ?? 0;
//       return (order.get(na) ?? 0) - (order.get(nb) ?? 0);
//     });

//     // 4) Normalize response
//     const result = docs.map((d) => ({
//       question: d.Question ?? d.question ?? "",
//       options: {
//         A: d["Option A"] ?? "",
//         B: d["Option B"] ?? "",
//         C: d["Option C"] ?? "",
//         D: d["Option D"] ?? "",
//       },
//     }));

//     return new Response(JSON.stringify(result), { status: 200 });
//   } catch (err) {
//     console.error("get-questions error:", err);
//     return new Response(JSON.stringify({ message: "Server error" }), {
//       status: 500,
//     });
//   } finally {
//     if (client) await client.close();
//   }
// }

// export const GET = withCORS(getQuestions);


import { MongoClient } from "mongodb";
import { withCORS } from "../../../middleware/cors";

export const dynamic = "force-dynamic";

async function getQuestions(req) {
  let client;
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    const testId = (searchParams.get("testId") || "").trim();

    if (!email) {
      return new Response(JSON.stringify({ message: "email is required" }), { status: 400 });
    }

    client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();

    // Pull the complete/assignment record for this email (+ testId if provided)
    const findFilter = { email, ...(testId ? { testId } : {}) };
    const track = await db.collection("questions_complete_record").findOne(
      findFilter,
      { projection: { _id: 0, questions: 1, isSubmit: 1 } }
    );

    // Nothing assigned for this batch/email
    if (!track) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // Helper: normalize "numbers" and an index of selections (if present)
    let assignedNumbers = [];
    let selectedByNumber = new Map();

    if (Array.isArray(track.questions) && track.questions.length > 0) {
      // track.questions could be array<number> (pre-submit) OR array<{questionNumber, selected, ...}> (post-submit)
      if (typeof track.questions[0] === "number") {
        assignedNumbers = track.questions.filter((n) => Number.isInteger(n) && n > 0);
      } else {
        for (const q of track.questions) {
          const num = q?.questionNumber ?? q?.QuestionNumber;
          if (Number.isInteger(num) && num > 0) {
            assignedNumbers.push(num);
            if (q?.selected) {
              selectedByNumber.set(num, String(q.selected));
            }
          }
        }
      }
    }

    if (assignedNumbers.length === 0) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    // Fetch question docs for these numbers
    const qdocs = await db
      .collection("cybersecurity_awareness_questions_full")
      .find(
        {
          $or: [
            { QuestionNumber: { $in: assignedNumbers } },
            { questionNumber: { $in: assignedNumbers } },
          ],
        },
        {
          projection: {
            _id: 0,
            Domain: 1,
            Question: 1,
            question: 1,
            "Option A": 1,
            "Option B": 1,
            "Option C": 1,
            "Option D": 1,
            "Correct Answer": 1,
            correctAnswer: 1,
            QuestionNumber: 1,
            questionNumber: 1,
          },
        }
      )
      .toArray();

    // Build index by question number for quick lookup
    const byNum = new Map();
    for (const d of qdocs) {
      const num = d.QuestionNumber ?? d.questionNumber;
      if (Number.isInteger(num)) byNum.set(num, d);
    }

    // Always return in the order of assignedNumbers
    const normalize = (d) => ({
      number: d?.QuestionNumber ?? d?.questionNumber ?? null,
      question: d?.Question ?? d?.question ?? "",
      options: {
        A: d?.["Option A"] ?? "",
        B: d?.["Option B"] ?? "",
        C: d?.["Option C"] ?? "",
        D: d?.["Option D"] ?? "",
      },
      correct:
        d?.["Correct Answer"] ??
        d?.correctAnswer ??
        "", // field name differs across docs
    });

    if (track.isSubmit) {
      // REVIEW payload: include selected + correct
      const review = assignedNumbers
        .map((num) => {
          const d = byNum.get(num);
          if (!d) return null;
          const base = normalize(d);
          return {
            ...base,
            selected: selectedByNumber.get(num) ?? null,
          };
        })
        .filter(Boolean);

      return new Response(JSON.stringify(review), { status: 200 });
    }

    // NOT submitted yet → return just the questions/options for answering
    const toAnswer = assignedNumbers
      .map((num) => {
        const d = byNum.get(num);
        if (!d) return null;
        const base = normalize(d);
        // For answering flow we don’t need to reveal the correct answer
        delete base.correct;
        return base;
      })
      .filter(Boolean);

    return new Response(JSON.stringify(toAnswer), { status: 200 });
  } catch (err) {
    console.error("get-questions error:", err);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  } finally {
    if (client) await client.close();
  }
}

export const GET = withCORS(getQuestions);
