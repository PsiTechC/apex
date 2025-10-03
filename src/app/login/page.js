"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/utils/Alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [alert, setAlert] = useState(null);
  const [restricted, setRestricted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("login"); // login | otp | password
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState(""); 
  const router = useRouter();



  useEffect(() => {
    fetch("/api/verify-token")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (data.status === "restricted") {
          setRestricted(true);
        } else if (data.status === "granted") {
          router.push("/dashboard");
        }
      })
      .catch(() => { });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingAction("login");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      setAlert({ type: "success", message: "Login successful!" });
      setTimeout(() => router.push("/dashboard"), 500);
    } else {
      setAlert({ type: "danger", message: data.message || "Login failed" });
    }
    setLoading(false);
    setLoadingAction("");
  };

  // 🔑 Forgot password flow
  const sendOtp = async () => {
    setError("");
    if (!email) {
      setError("Please enter your email first.");
      return;
    }
    setLoading(true);
    setLoadingAction("sendOtp");
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "send_otp" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("otp");
        setAlert({ type: "success", message: data.message });
      } else {
        setError(data.error || "Failed to send OTP");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
    setLoadingAction("");
  };

  const verifyOtp = async () => {
    setError("");
    if (!otp) {
      setError("Enter the OTP you received.");
      return;
    }
    setLoading(true);
    setLoadingAction("verifyOtp");
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, action: "verify_otp" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("password");
        setAlert({ type: "success", message: data.message });
      } else {
        setError(data.error || "Invalid OTP");
      }
    } catch {
      setError("Server error during verification");
    }
    setLoading(false);
    setLoadingAction("");
  };

  const updatePassword = async () => {
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setLoadingAction("updatePassword");
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          otp,
          newPassword,
          action: "verify_and_change",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAlert({ type: "success", message: data.message });
        setStep("login");
        setPassword("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Failed to update password");
      }
    } catch {
      setError("Server error");
    }
    setLoading(false);
    setLoadingAction("");
  };


  const buttonClass =
    "w-full h-12 flex justify-center items-center bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-medium rounded-xl shadow-lg transition disabled:opacity-70 mt-6";

    const getButtonText = () => {
      if (!loading) {
        if (step === "login") return "Sign In";
        if (step === "otp") return "Verify OTP";
        if (step === "password") return "Update Password";
      } else {
        if (loadingAction === "login") return "Signing in...";
        if (loadingAction === "sendOtp") return "Sending OTP...";
        if (loadingAction === "verifyOtp") return "Verifying...";
        if (loadingAction === "updatePassword") return "Updating...";
      }
    };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-apex">
      {/* Background effects */}
      <div className="absolute inset-0 grid grid-cols-12 gap-0 opacity-40 pointer-events-none">
        {Array.from({ length: 144 }).map((_, i) => (
          <div
            key={i}
            className="border border-slate-200/40 bg-white/10 backdrop-blur-[1px]"
          />
        ))}
      </div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Control Management
          </h1>
          <p className="text-slate-600 text-sm">
            Secure access to your financial dashboard
          </p>
        </div>

        {alert && (
          <div className="mb-4">
            <Alert {...alert} onClose={() => setAlert(null)} />
          </div>
        )}

        <div className="bg-white backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200/60">
          {restricted ? (
            <p className="text-center text-red-600 font-medium">
              Your access is restricted. Please contact the administrator.
            </p>
          ) : (
            <>
              {/* LOGIN */}
              {step === "login" && (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-slate-700 font-medium text-sm">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-12 px-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition text-slate-900"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-700 font-medium text-sm">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={sendOtp}
                        className="text-sm text-slate-600 hover:text-blue-600 font-medium transition"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full h-12 px-4 bg-slate-50/50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition text-slate-900"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button type="submit" disabled={loading} className={buttonClass}>
                    {getButtonText()}
                  </button>
                </form>
              )}

              {/* OTP */}
              {step === "otp" && (
                <div className="space-y-5">
                  <p className="text-sm text-gray-600">
                    Enter the OTP sent to <strong>{email}</strong>
                  </p>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full h-12 px-4 border border-slate-200 rounded-xl text-slate-900"
                    placeholder="Enter OTP"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button onClick={verifyOtp} disabled={loading} className={buttonClass}>
                    {getButtonText()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("login")}
                    className="w-full h-10 text-sm text-slate-600 hover:text-blue-600"
                  >
                    ← Back to Login
                  </button>
                </div>
              )}

              {/* RESET PASSWORD */}
              {step === "password" && (
                <div className="space-y-5">
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 px-4 border border-slate-200 rounded-xl text-slate-900"
                  />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 px-4 border border-slate-200 rounded-xl text-slate-900"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button onClick={updatePassword} disabled={loading} className={buttonClass}>
                    {getButtonText()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("login")}
                    className="w-full h-10 text-sm text-slate-600 hover:text-blue-600"
                  >
                    ← Back to Login
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
