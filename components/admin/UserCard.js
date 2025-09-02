"use client";
import { useState } from "react";
import Alert from "@/components/utils/Alert";

export default function UserCard({ user }) {
  const [enabled, setEnabled] = useState(user.status !== "restricted");
  const [alert, setAlert] = useState(null);

  const requestStatusChange = () => {
    const newStatus = enabled ? "restricted" : "granted";

    setAlert({
      type: "warning",
      message: `Are you sure you want to ${enabled ? "disable" : "enable"} this user?`,
      isConfirm: true,
      onConfirm: async () => {
        const res = await fetch("/api/for-admin/update-user-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, status: newStatus }),
        });

        if (res.ok) {
          setEnabled(!enabled);
          setAlert({
            type: "success",
            message: `User ${enabled ? "disabled" : "enabled"} successfully.`,
          });
        } else {
          setAlert({
            type: "danger",
            message: "Failed to update user access.",
          });
        }
      },
      onCancel: () => null,
    });
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-4 mb-4 w-full max-w-md relative">
      {alert && (
        <div className="absolute top-2 right-2 z-50">
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

      <div className="text-md font-semibold text-gray-800 mb-1">{user.email}</div>
      <div className="text-sm text-gray-600 mb-1">
        <strong>Role:</strong> {user.role}
      </div>
      <div className="text-sm text-gray-600 mb-3">
        <strong>Created:</strong> {new Date(user.createdAt).toLocaleString()}
      </div>
      <div className="flex justify-end">
        <button
          onClick={requestStatusChange}
          className={`text-sm px-4 py-1 rounded ${
            enabled ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 hover:bg-gray-500"
          } text-white`}
        >
          {enabled ? "Disable" : "Enable"}
        </button>
      </div>
    </div>
  );
}
