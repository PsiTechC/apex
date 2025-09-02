"use client";
import { useEffect, useState } from "react";
import UserCard from "@/components/admin/UserCard";
import Alert from "@/components/utils/Alert";

export default function ManageUsers() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [users, setUsers] = useState([]);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reType, setReType] = useState("");



  useEffect(() => {
    fetch("/api/for-admin/get-users")
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error("Failed to fetch users", err));
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reType) {                                      // ✓ guard
      setAlert({ type: "danger", message: "Please select an RE Type." });
      return;
    }
    setLoading(true);

    const res = await fetch("/api/for-admin/add-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, companyName, reType }), // ✓ include reType
    });

    const result = await res.json();

    if (res.ok) {
      setAlert({ type: "success", message: "CISO added successfully!" });
      setShowModal(false);
      setEmail("");
      setCompanyName("");
      setReType("");                                     // ✓ reset

      const newUsers = await fetch("/api/for-admin/get-users").then(r => r.json());
      setUsers(newUsers);
    } else {
      setAlert({ type: "danger", message: result?.message || "Failed to add user." });
    }
    setLoading(false);
  };


  return (

    <>
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

      <div className="p-6">
        <div className="bg-white p-6 rounded-lg shadow-md relative">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              + Add CISO
            </button>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mt-4">
            {users.map((u, i) => (
              <UserCard key={i} user={u} />
            ))}
          </div>

        </div>


        {showModal && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add CISO</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              {/* RE Type (values match backend ALLOWED set) */}
              <div>
                <label className="block text-sm font-medium mb-1">RE Type</label>
                <select
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  value={reType}
                  onChange={(e) => setReType(e.target.value)}
                  required
                >
                  <option value="">Select RE Type</option>
                  <option value="RE_MII">MII</option>
                  <option value="RE_QUALIFIED">QUALIFIED</option>
                  <option value="RE_MID_SIZED">MID_SIZED</option>
                  <option value="RE_SMALL_SIZED">SMALL_SIZED</option>
                  <option value="RE_SELF_CERT">SELF_CERT</option>
                </select>
              </div>

              {loading ? (
                <div className="flex justify-center items-center w-full">
                  <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    type="button"
                    className="text-sm text-gray-600"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                    disabled={!email || !companyName || !reType} // ✓ UX: disable until valid
                  >
                    Add
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      </div>  </>
  );
}