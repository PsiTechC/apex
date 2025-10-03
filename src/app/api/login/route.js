import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { withCORS } from '../../middleware/cors';

async function handleLogin(request) {
  const { email, password } = await request.json();

  const adminEmail = process.env.ADMIN_ID;
  const adminPass = process.env.ADMIN_PASS;

  // Step 1: Admin login using env credentials
  if (email === adminEmail && password === adminPass) {
    const token = jwt.sign(
      { email, role: "admin" }, // ✅ no `status` here
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const response = new Response(JSON.stringify({ message: "Login successful" }), { status: 200 });
    response.headers.set(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
    );

    return response;
  }

  // Step 2: Database user login
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI);
    const db = client.db("APEX");
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return new Response(JSON.stringify({ message: "Invalid password" }), { status: 401 });
    }

    if (user.status === "restricted") {
      return new Response(
        JSON.stringify({ message: "Your account is restricted. Please contact the administrator." }),
        { status: 403 }
      );
    }

    const token = jwt.sign(
      {
        email: user.email,
        role: user.role,
        status: user.status ?? "active",
        organizationType: user.organizationType ?? null, // e.g. "RE_MII"
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const response = new Response(JSON.stringify({ message: "Login successful" }), { status: 200 });
    response.headers.set(
      "Set-Cookie",
      `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Strict`
    );

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}

export const POST = withCORS(handleLogin);