// lib/question_broadcast.js
import nodemailer from "nodemailer";
import { MongoClient } from "mongodb";

export async function question_broadcast(emails, questions, testId) {
  try {
    const BASE_URL = (process.env.BASE_URL || "").replace(/\/+$/, "");
    if (!BASE_URL) {
      console.error("[question_broadcast] Missing BASE_URL env");
      return;
    }

    const list = Array.isArray(emails) ? emails.filter(Boolean) : [];
    const qs = Array.isArray(questions) ? questions : [];

    if (list.length === 0) {
      console.log("[question_broadcast] No recipients; skip sending.");
      return;
    }

    // setup SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: String(process.env.SMTP_SECURE) === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

    const subject = "Your Cybersecurity Awareness Training";

    // open Mongo connection once for all inserts
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db();
    const completeCol = db.collection("questions_complete_record");

    const jobs = list.map(async (to) => {
      const link = `${BASE_URL}/training?email=${encodeURIComponent(to)}${testId ? `&testId=${encodeURIComponent(testId)}` : ""}`;


      const text = `Hello,

You've been invited to complete a short cybersecurity awareness training.

Open your training here:
${link}

The questions were selected by your security team.
No login is required.

Total questions: ${qs.length}

Thanks,
APEX Team`;

      const html = `
        <p>Hello,</p>
        <p>You've been invited to complete a short <strong>cybersecurity awareness training</strong>.</p>
        <p>
          <a href="${link}" target="_blank" rel="noopener noreferrer">
            Start your training
          </a>.
        </p>
        <br/>
        <p>Thanks,<br/>APEX Team</p>
      `;

      try {
        const info = await transporter.sendMail({
          from: `"APEX Training" <${process.env.SMTP_USER}>`,
          to,
          subject,
          text,
          html,
        });
        console.log("[question_broadcast] sent →", to, "messageId:", info.messageId);

        // save into questions_complete_record
        await completeCol.insertOne({
          email: to,
          questions: qs,
          testId: testId || null,
          createdAt: new Date(),
        });
      } catch (err) {
        console.error("[question_broadcast] failed →", to, err);
      }
    });

    await Promise.allSettled(jobs);

    await client.close();

    console.log(
      "[question_broadcast] finished.",
      "recipients:", list.length,
      "questions:", qs.length
    );
  } catch (err) {
    console.error("[question_broadcast] failed:", err);
  }
}
