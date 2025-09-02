import jwt from "jsonwebtoken";

export async function GET(req) {
  const cookieHeader = req.headers.get("cookie");
  const token = cookieHeader?.split(";").find(c => c.trim().startsWith("token="))?.split("=")[1];

  if (!token) {
    return new Response(JSON.stringify({ role: null }), { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return new Response(JSON.stringify({ role: decoded.role , email: decoded.email, status: decoded.status,  organizationType: decoded.organizationType}), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ role: null }), { status: 403 });
  }
}
