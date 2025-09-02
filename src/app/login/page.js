"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/utils/Alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState(null);

  const [restricted, setRestricted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/verify-token")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (data.status === "restricted") {
          setRestricted(true); // flag to block form
        } else if (data.status === "granted") {
          if (data.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/dashboard");
          }
        }
      })
      .catch(() => {
        // no token or invalid token — stay on login
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  
    const data = await res.json();
  
    if (res.ok) {
      setAlert({ type: "success", message: "Login successful!" });

  
      // Step 1: Wait for token to be set (optional short delay)
      setTimeout(async () => {
        try {
          const verifyRes = await fetch("/api/verify-token");
          if (!verifyRes.ok) throw new Error("Unauthorized");
          const verifyData = await verifyRes.json();
  
          if (verifyData.status === "restricted") {
            setRestricted(true);
            setAlert({ type: "danger", message: "Your account is restricted. Please contact the administrator." });

          } else {
            if (verifyData.role === "admin") {
              router.push("/dashboard");
            } else {
              router.push("/dashboard");
            }
          }
        } catch (err) {
          setAlert({type: "danger", message: "Verification failed. Try again." });
        }
      }, 300); // optional slight delay to ensure cookie is set
    } else {
      setAlert({ type: "danger", message: data.message || "Login failed" });
    }
  };
  

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f0f4f8] to-[#dfe9f3] px-4 font-apex">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-3xl font-bold text-center text-[#1E293B] mb-6">
          {restricted ? "Account Restricted" : "Welcome Back"}
        </h2>

        {alert && (
  <div className="fixed top-6 right-4 sm:right-6 z-[9999]">
    <Alert
      {...alert}
      onClose={() => setAlert(null)}
    />
  </div>
)}


        {restricted ? (
          <p className="text-center text-red-600 font-medium">
            Your access is restricted. Please contact the administrator.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-800 mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#5D5FEF] text-white py-2 px-4 rounded-lg hover:bg-[#4d4fec] transition duration-200"
            >
              Login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
