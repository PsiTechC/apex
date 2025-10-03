import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import { withCORS } from '../../middleware/cors';

const OTP_EXPIRY_MINUTES = 10;

const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const mongoUri = process.env.MONGO_URI;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: { user, pass },
  tls: { rejectUnauthorized: false },
});

async function handlePasswordReset(req) {
  try {
    const { email, otp, newPassword, action } = await req.json();
    const client = await MongoClient.connect(mongoUri);
    const db = client.db("APEX");
    const users = db.collection("users");

    if (action === "send_otp") {
      const existingUser = await users.findOne({ email });
      if (!existingUser) {
        client.close();
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);
      const hashedOtp = await bcrypt.hash(generatedOtp, 10);

      await db.collection("otps").updateOne(
        { email },
        {
          $set: {
            email,
            hashedOtp,
            expiresAt,
          },
        },
        { upsert: true }
      );
      

      const mailOptions = {
        from: `"Apex Security" <${user}>`,
        to: email,
        subject: "Your OTP to Reset Password",
        html: `
          <p>Dear User,</p>
          <p>Your OTP for resetting your password is:</p>
          <h2>${generatedOtp}</h2>
          <p>This OTP is valid for <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.</p>
          <p>If you didn't request this, please ignore.</p>
          <br/>
          <p>Regards,<br/>Apex Team</p>
        `,
      };

      const mailResult = await transporter.sendMail(mailOptions);
      client.close();

      if (!mailResult.accepted.includes(email)) {
        return NextResponse.json({ error: "Failed to send OTP email" }, { status: 500 });
      }

      return NextResponse.json({ message: "OTP sent successfully" });
    }

    if (action === "verify_otp") {
      const stored = await db.collection("otps").findOne({ email });

      if (!stored || !(await bcrypt.compare(otp, stored.hashedOtp))
      || new Date() > stored.expiresAt) {
        client.close();
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
      }

      return NextResponse.json({ message: "OTP verified" });
    }

    if (action === "verify_and_change") {
      const stored = await db.collection("otps").findOne({ email });

      if (!stored || !(await bcrypt.compare(otp, stored.hashedOtp))
      || new Date() > stored.expiresAt) {
        client.close();
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await users.updateOne({ email }, { $set: { password: hashedPassword } });
      await db.collection("otps").deleteOne({ email });


      client.close();
      return NextResponse.json({ message: "Password updated successfully" });
    }

    client.close();
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const POST = withCORS(handlePasswordReset);