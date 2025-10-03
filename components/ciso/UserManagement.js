import { FaTrash } from "react-icons/fa";
import { useState } from "react";
import Alert from "../utils/Alert";

export default function UserManagement({ ownerEmails = [], onRefresh }) {
  const [emails, setEmails] = useState(ownerEmails);
  const [loadingEmail, setLoadingEmail] = useState(null);
  const [alert, setAlert] = useState(null);

  const handleDelete = async (email) => {
    setAlert({
      type: "danger",
      message: `Are you sure you want to delete this user? All the controls assigned to ${email} will also be deleted, including any approved controls.`,
      isConfirm: true,
      onConfirm: async () => {
        try {
          setLoadingEmail(email);

          const res = await fetch("/api/ciso/delete-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          const data = await res.json();

          if (res.ok) {
            setAlert({
              type: "success",
              message: `✅ User ${email} and their evidences were deleted. Removed users: ${data.deletedUserCount}, evidences: ${data.deletedEvidenceCount}`,
              onClose: () => setAlert(null),
            });

            // refresh from parent
            onRefresh?.();
          } else {
            setAlert({
              type: "danger",
              message: `❌ Failed: ${data.message || "Unknown error"}`,
              onClose: () => setAlert(null),
            });
          }
        } catch (err) {
          console.error("Delete error:", err);
          setAlert({
            type: "danger",
            message: "Server error while deleting user.",
            onClose: () => setAlert(null),
          });
        } finally {
          setLoadingEmail(null);
        }
      },
      onCancel: () => setAlert(null),
    });
  };

  return (
    <div className="p-6">
      {alert && <Alert {...alert} onClose={() => setAlert(null)} />}

      {emails.length === 0 ? (
        <p className="text-start text-gray-500 text-sm font-medium">
          No owners/IT available
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {emails.map((email, index) => (
            <div
              key={index}
              className="bg-white border rounded-xl shadow-sm p-4 flex flex-col justify-between"
            >
              <p className="text-gray-800 font-medium text-sm truncate">
                {email}
              </p>
              <div className="flex gap-2 mt-4">
                <button className="flex-1 bg-green-100 hover:bg-green-200 text-green-800 text-xs px-3 py-1 rounded border border-green-300 transition">
                  Enable
                </button>

                <button
                  onClick={() => handleDelete(email)}
                  disabled={loadingEmail === email}
                  className="flex items-center justify-center flex-1 bg-red-100 hover:bg-red-200 text-red-600 text-xs px-3 py-1 rounded border border-red-300 transition disabled:opacity-50"
                >
                  {loadingEmail === email ? "..." : <FaTrash size={12} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
