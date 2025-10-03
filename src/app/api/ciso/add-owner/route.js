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

async function addOwner(req) {
  try {
    const { email, role, cisoEmail } = await req.json();

    if (!["owner", "it_committee"].includes(role)) {
      return new Response(JSON.stringify({ message: "Invalid role provided" }), { status: 400 });
    }

    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");

    // Step 1: Find CISO
    const ciso = await db.collection("users").findOne({ email: cisoEmail, role: "ciso" });
    if (!ciso) {
      client.close();
      return new Response(JSON.stringify({ message: "CISO not found" }), { status: 404 });
    }

    // Step 2: Prevent duplicate user
    const exists = await db.collection("users").findOne({ email });
    if (exists) {
      client.close();
      return new Response(JSON.stringify({ message: "User already exists" }), { status: 409 });
    }

    // Step 3: Generate password and hash
    const plainPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Step 4: Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    const roleLabel = role === "owner" ? "Control Owner" : "IT Committee Member";

    const mailOptions = {
      from: `"CISO Admin" <${user}>`,
      to: email,
      subject: `Your ${roleLabel} Access to APEX Platform`,
      text: `Welcome to the APEX platform!

You have been added as a ${roleLabel}

Login Email: ${email}
Temporary Password: ${plainPassword}

Please log in and change your password after first login.

Regards,
CISO Admin`,
      html: `
        <p>Welcome to the <strong>APEX</strong> platform!</p>
        <p>You have been added as a <strong>${roleLabel}</strong></p>
        <p><strong>Login Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${plainPassword}</p>
        <p>Please log in and change your password after first login.</p>
        <br/>
        <p>Regards,<br/>CISO Admin</p>
      `,
    };

    const mailResult = await transporter.sendMail(mailOptions);
    if (!mailResult.accepted.includes(email)) {
      client.close();
      return new Response(JSON.stringify({ message: "Failed to send email" }), { status: 500 });
    }

    // Step 5: Insert user
    await db.collection("users").insertOne({
      email,
      password: hashedPassword,
      role,
      createdAt: new Date(),
    });

    // Step 6: Map under ciso_email → members: [user_email]
    await db.collection("ciso_owner_it_mapping").updateOne(
      { ciso_email: cisoEmail },
      { $addToSet: { members: email } },
      { upsert: true }
    );

    client.close();
    return new Response(JSON.stringify({ message: `${roleLabel} created, mapped and email sent` }), { status: 201 });

  } catch (err) {
    console.error("Error creating user:", err.message);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}




export const POST = withCORS(addOwner);
