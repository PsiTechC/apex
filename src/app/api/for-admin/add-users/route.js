import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { withCORS } from '../../../middleware/cors';

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;

function generateRandomPassword(length = 8) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join("");
}

async function addUsers(req) {
  try {
    const { email, companyName, reType } = await req.json();

        const ALLOWED = new Set([
          "RE_MII",
          "RE_QUALIFIED",
          "RE_MID_SIZED",
          "RE_SMALL_SIZED",
          "RE_SELF_CERT",
        ]);
        if (!ALLOWED.has(reType)) {
          return new Response(JSON.stringify({ message: "Invalid RE type" }), { status: 400 });
        }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");

    // Check if user already exists
    const exists = await db.collection("users").findOne({ email });
    if (exists) {
      client.close();
      return new Response(JSON.stringify({ message: "User already exists" }), { status: 409 });
    }

    // Generate password and hash
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Setup Nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    const mailOptions = {
      from: `"Apex Admin" <${user}>`,
      to: email,
      subject: "Your CISO Access to APEX Platform",
      text: `Welcome to the APEX platform!

You have been added as a CISO for company: ${companyName}

Login Email: ${email}
Temporary Password: ${plainPassword}

Please log in and change your password after first login.

Regards,
Apex Admin`,
      html: `
        <p>Welcome to the <strong>APEX</strong> platform!</p>
        <p>You have been added as a <strong>CISO user</strong> for company: <strong>${companyName}</strong></p>
        <p><strong>Login Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${plainPassword}</p>
        <p>Please log in and change your password after first login.</p>
        <br/>
        <p>Regards,<br/>Apex Team</p>
      `,
    };

    const mailResult = await transporter.sendMail(mailOptions);

    if (!mailResult.accepted.includes(email)) {
      client.close();
      return new Response(JSON.stringify({ message: "Failed to send email" }), { status: 500 });
    }

    // Save user
    await db.collection("users").insertOne({
      email,
      companyName,
      password: hashedPassword,
      organizationType: reType,
      role: "ciso",
      createdAt: new Date(),
    });

    client.close();
    return new Response(JSON.stringify({ message: "CISO user created and email sent" }), { status: 201 });

  } catch (err) {
    console.error("Error creating CISO:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const POST = withCORS(addUsers);
