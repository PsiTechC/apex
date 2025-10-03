import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { useState, useRef, useEffect } from "react";
import Alert from "@/components/utils/Alert"; // Import your Alert component


export default function Topbar({ title, toggleSidebar, sidebarOpen, email, role }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [step, setStep] = useState("default"); // 'default', 'sending', 'otp', 'password'
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const dropdownRef = useRef(null);
  const [alert, setAlert] = useState(null); // for showing Alert


  const initials = email
    ? email.split("@")[0].split(".").map(part => part[0]?.toUpperCase()).join("").slice(0, 2)
    : "U";

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
        resetState();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const resetState = () => {
    setStep("default");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  const sendOtp = async () => {
    setStep("sending");
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "send_otp" }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("otp");
      } else {
        setStep("default");
        setError(data.error || "Failed to send OTP");
      }
    } catch (e) {
      setStep("default");
      setError("Network error");
    }
  };

  const verifyOtp = async () => {
    if (!otp) return;

    setStep("verifying");

    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, action: "verify_otp" }),
      });

      const data = await res.json();
      if (res.ok) {
        setStep("password");
      } else {
        setStep("otp");
        setError(data.error || "Invalid OTP");
      }
    } catch {
      setStep("otp");
      setError("Server error during verification");
    }
  };


  const updatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

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
        resetState();
        setAlert({
          type: "success",
          message: "Password updated successfully!",
        });

        setDropdownOpen(false);
      } else {
        setAlert({
          type: "danger",
          message: "Failed to update password",
        });

      }
    } catch {
      setAlert({
        type: "danger",
        message: "Server error",
      });

    }
  };

  return (
    <div
      className="bg-white h-16 px-6 border-b border-[#DFE1E6] flex justify-between items-center fixed top-0 left-0 right-0 z-50"
      style={{ fontFamily: '"Segoe UI", "Roboto", "Inter", system-ui, sans-serif' }}
    >
      {alert && (
        <div className="fixed top-6 right-4 sm:right-6 z-[9999]">
          <Alert
            {...alert}
            onClose={() => setAlert(null)}
            onConfirm={() => {
              alert.onConfirm?.();
              setAlert(null);
            }}
            onCancel={() => {
              alert.onCancel?.();
              setAlert(null);
            }}
          />
        </div>
      )}

      <div className="w-1/3 flex items-center relative">
        <button
          onClick={toggleSidebar}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="p-[6px] bg-[#F4F5F7] rounded-md border border-[#DFE1E6] hover:bg-[#EBECF0] transition"
        >
          <div className="w-6 h-6 flex items-center justify-center rounded">
            {sidebarOpen ? (
              <ChevronLeftIcon className="w-4 h-4 text-[#5E6C84]" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-[#5E6C84]" />
            )}
          </div>
        </button>
        {showTooltip && (
          <div className="absolute top-12 left-0 bg-[#232423] text-white text-xs px-2 py-1 rounded shadow-md z-50">
            {sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          </div>
        )}
      </div>

      <h1 className="text-2xl font-semibold text-center w-1/3 capitalize">
        {title}
      </h1>

      {/* Profile + Dropdown */}
      <div className="w-1/3 flex justify-end relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00ACC1] text-white font-bold text-sm"
        >
          {initials}
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-11 w-80 bg-white rounded-xl shadow-lg z-50 border text-sm p-4">
            <div className="flex gap-4 mb-1">
              <div className="w-14 h-14 rounded-full bg-[#00ACC1] text-white font-bold flex items-center justify-center text-xl">
                {initials}
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[#172B4D] font-semibold text-sm">
                  {email}
                </span>

                {step === "default" && role !== "admin" && (
                  <button
                    className="text-left text-red-600 hover:text-red-700 hover:bg-red-50 px-0 py-1 rounded w-max mt-1"
                    onClick={sendOtp}
                  >
                    Change password
                  </button>
                )}


                {step === "sending" && (
                  <div className="mt-2 text-xs text-gray-500">Sending OTP...
                    <span className="ml-2 animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-[#00ACC1] rounded-full" />
                  </div>
                )}
              </div>
            </div>

            {step === "otp" && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value);
                    if (error) setError("");
                  }}
                  className="w-full border rounded px-3 py-2 text-sm mt-2"
                />
                <button
                  onClick={verifyOtp}
                  className="mt-2 w-full bg-[#00ACC1] text-white py-2 rounded hover:bg-[#0097a7] text-sm"
                >
                  Verify OTP
                </button>
              </div>
            )}
            {step === "verifying" && (
              <div className="mt-4 flex justify-center items-center">
                <div className="w-6 h-6 border-4 border-[#00ACC1] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {step === "password" && (
              <div className="mt-2 space-y-2">
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <button
                  onClick={updatePassword}
                  className="w-full bg-[#00ACC1] text-white py-2 rounded hover:bg-[#0097a7] text-sm"
                >
                  Update Password
                </button>
              </div>
            )}

            {error && (
              <div className="mt-2 text-xs text-red-600 font-medium">{error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}