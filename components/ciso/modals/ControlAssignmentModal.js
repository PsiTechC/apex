"use client";
import React, { useState } from "react";
import Alert from "../../utils/Alert";

export default function ControlAssignmentModal({
  controlId,
  members = [],
  description,
  guidance,
  goal,
  function: func,
  assignedOwners = [],
  mode = "assign",
  onClose,
  onRefresh,
  cisoEmail,
}) {
  const [evidences, setEvidences] = useState(() => {
    if (mode === "reassign" && assignedOwners.length > 0) {
      return assignedOwners.flatMap((owner, ownerIdx) =>
        (owner.evidences || []).map((evi, idx) => ({
          id: `${ownerIdx}-${idx}`, // unique ID
          name: evi.name || `Evidence ${idx + 1}`,
          frequency: evi.frequency || "",
          owner: owner.owner || "",
        }))
      );
    }
    return [{ id: "0-0", name: "Evidence 1", frequency: "", owner: "" }];
  });

  const [loading, setLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const handleEvidenceChange = (id, field, value) => {
    setEvidences((prev) =>
      prev.map((evi) =>
        evi.id === id ? { ...evi, [field]: value } : evi
      )
    );
  };

  const handleAddEvidence = () => {
    const newIndex = evidences.length + 1;
    setEvidences([
      ...evidences,
      { id: `${Date.now()}`, name: `Evidence ${newIndex}`, frequency: "", owner: "" },
    ]);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const payload = {
        controlId,
        goal,
        function: func,
        description,
        guidance,
        evidences,
        ciso_email: cisoEmail,
      };

      const res = await fetch("/api/ciso/assign-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to assign control");

      const result = await res.json();
      console.log("✅ Assignment successful:", result.message);

      setShowAlert(true);
      setTimeout(() => {
        onClose();
        onRefresh();
      }, 1000);
    } catch (err) {
      console.error("❌ Error assigning control:", err.message);
      alert("Something went wrong while saving. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
        {showAlert && (
          <div className="absolute top-4 left-4 right-4 z-50">
            <Alert
              type="success"
              message="Control assigned successfully!"
              visible={showAlert}
              onClose={() => setShowAlert(false)}
            />
          </div>
        )}

        <h2 className="text-lg font-semibold text-gray-800 mb-4">Control Assignment</h2>

        {/* Top Fields */}
        <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
          <div>
            <label className="block font-semibold text-gray-600 mb-1">Financial Year</label>
            <input
              type="text"
              value="2025–2026"
              readOnly
              className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-600 mb-1">Goal</label>
            <input
              type="text"
              value={goal || "-"}
              readOnly
              className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-600 mb-1">Function</label>
            <input
              type="text"
              value={func || "-"}
              readOnly
              className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100"
            />
          </div>
        </div>

        {/* Description & Guidance */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-600 mb-1">Control Description</label>
          <textarea
            readOnly
            value={description || "-"}
            rows={3}
            className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-sm"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-600 mb-1">Compliance Guidance</label>
          <textarea
            readOnly
            value={guidance || "-"}
            rows={3}
            className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-sm"
          />
        </div>

        {/* Evidences */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Evidences</h3>
            <button onClick={handleAddEvidence} className="text-sm text-blue-600 hover:underline">
              + Add Evidence
            </button>
          </div>
          {evidences
            .slice()
            .sort((a, b) => {
              const numA = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
              const numB = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
              return numA - numB;
            })
            .map((evi) => (
              <div key={evi.id} className="grid grid-cols-3 gap-4 mb-2 items-center text-sm">
                <span className="text-gray-700">{evi.name}</span>
                <select
                  className="border border-gray-300 px-3 py-2 rounded w-full"
                  value={evi.frequency}
                  onChange={(e) => handleEvidenceChange(evi.id, "frequency", e.target.value)}
                >
                  <option value="">Select Frequency</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
                <select
                  className="border border-gray-300 px-3 py-2 rounded w-full"
                  value={evi.owner}
                  onChange={(e) => handleEvidenceChange(evi.id, "owner", e.target.value)}
                >
                  <option value="">Select Owner</option>
                  {members.map((email, i) => (
                    <option key={i} value={email}>
                      {email}
                    </option>
                  ))}
                </select>
              </div>
            ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 mt-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-medium">Saving...</span>
            </div>
          ) : (
            <>
              <button
                onClick={onClose}
                className="bg-gray-200 hover:bg-gray-300 text-sm text-gray-800 px-4 py-2 rounded"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded"
              >
                {mode === "reassign" ? "Reassign" : "Assign"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
