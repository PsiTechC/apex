"use client";
import { useEffect, useState } from "react";

export default function RiskRegister({ ciso_email, organizationType }) {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false); // ✅ loader for saving risks
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("controls");

  // Others tab
  const [otherRisks, setOtherRisks] = useState([
    { description: "", type: "", date: "" },
  ]);

  // Controls tab
  const [editingControl, setEditingControl] = useState(null);
  const [controlDescription, setControlDescription] = useState("");

  // Saved risks from DB
  const [savedRisks, setSavedRisks] = useState([]);
  const [fetchingRisks, setFetchingRisks] = useState(false);
  const [savedTab, setSavedTab] = useState("saved-controls");

  const handleOtherChange = (index, field, value) => {
    const updated = [...otherRisks];
    updated[index][field] = value;
    setOtherRisks(updated);
  };

  const handleAddRow = () => {
    setOtherRisks([...otherRisks, { description: "", type: "", date: "" }]);
  };

  // Fetch controls when modal opens
  useEffect(() => {
    if (!showModal || !organizationType) return;

    setLoading(true);
    fetch(`/api/ciso/get-controls?organizationType=${encodeURIComponent(organizationType)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch controls");
        return res.json();
      })
      .then((data) => {
        setControls(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching controls:", err);
        setError("Failed to load controls.");
        setLoading(false);
      });
  }, [showModal, organizationType]);

  // Fetch risks from DB when component mounts
  useEffect(() => {
    if (!ciso_email) return;

    setFetchingRisks(true);
    fetch(`/api/ciso/get-risk-controls?email=${encodeURIComponent(ciso_email)}`)
      .then((res) => res.json())
      .then((data) => {
        setSavedRisks(data.risks || []); 
        setSavedTab("saved-controls");
      })
      .catch((err) => {
        console.error("Error fetching risks:", err);
      })
      .finally(() => setFetchingRisks(false));
  }, [ciso_email, showModal]);

  // --- Save Control Risk ---
  const handleMarkRisk = (controlId) => {
    setEditingControl(controlId);
    setControlDescription("");
  };

  const handleSaveControlRisk = async (control) => {
    setSaving(true); // ✅ start loader
    try {
      const res = await fetch("/api/ciso/get-risk-controls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskType: "control",
          controlId: control["CONTROL ID"],
          description: controlDescription,
          ciso_email,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        console.log("✅ Control Risk Saved:", result);
        // Refresh saved risks
        const updated = await fetch(`/api/ciso/get-risk-controls?email=${encodeURIComponent(ciso_email)}`).then((r) => r.json());
        setSavedRisks(updated.risks || []);
      } else {
        console.error("❌ Failed to save control risk:", result.message);
      }
    } catch (err) {
      console.error("❌ Error saving control risk:", err);
    } finally {
      setSaving(false); // ✅ stop loader
      setEditingControl(null);
      setControlDescription("");
    }
  };

  // --- Save Other Risks ---
  const handleMarkOtherRisk = async () => {
    setSaving(true); // ✅ start loader
    try {
      for (const risk of otherRisks) {
        if (!risk.description || !risk.type || !risk.date) {
          console.warn("⚠️ Skipping incomplete risk:", risk);
          continue;
        }

        const res = await fetch("/api/ciso/get-risk-controls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            riskType: "other",
            description: risk.description,
            type: risk.type,
            date: risk.date,
            ciso_email,
          }),
        });

        const result = await res.json();
        if (res.ok) {
          console.log("✅ Other Risk Saved:", result);
        } else {
          console.error("❌ Failed to save other risk:", result.message);
        }
      }
      // Refresh saved risks
      const updated = await fetch(`/api/ciso/get-risk-controls?email=${encodeURIComponent(ciso_email)}`).then((r) => r.json());
      setSavedRisks(updated.assignedControls || []);
    } catch (err) {
      console.error("❌ Error saving other risks:", err);
    } finally {
      setSaving(false); // ✅ stop loader
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowModal(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          + Add Risk
        </button>
      </div>

{/* Show saved risks below button */}
<div className="mt-6">
  <h4 className="font-semibold mb-2">Saved Risks</h4>

  {fetchingRisks ? (
    // ✅ Tailwind loader
    <div className="flex items-center justify-center py-6">
      <div className="h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="ml-3 text-sm text-gray-600">Fetching risks…</span>
    </div>
  ) : savedRisks.length > 0 ? (
    <>
      {/* Tabs for saved risks */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            savedTab === "saved-controls"
              ? "border-b-2 border-purple-600 text-purple-600"
              : "text-gray-600"
          }`}
          onClick={() => setSavedTab("saved-controls")}
        >
          Control Risks
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            savedTab === "saved-others"
              ? "border-b-2 border-purple-600 text-purple-600"
              : "text-gray-600"
          }`}
          onClick={() => setSavedTab("saved-others")}
        >
          Others
        </button>
      </div>

      {/* Control Risks List */}
      {savedTab === "saved-controls" && (
        <ul className="space-y-2">
          {savedRisks.filter((r) => r.riskType === "control").length > 0 ? (
            savedRisks
              .filter((r) => r.riskType === "control")
              .map((risk) => (
                <li key={risk.id} className="p-3 border rounded bg-gray-50 text-sm">
                  <span className="font-medium">CONTROL</span>:{" "}
                  <span>
                    <span className="text-purple-600">Control ID:</span>{" "}
                    {risk.controlId} — {risk.description}
                  </span>
                  <div className="text-gray-500 text-xs mt-1">
                    Added on {new Date(risk.timestamp).toLocaleDateString()}
                  </div>
                </li>
              ))
          ) : (
            <p className="text-sm text-gray-500">No control risks recorded yet.</p>
          )}
        </ul>
      )}

      {/* Other Risks List */}
      {savedTab === "saved-others" && (
        <ul className="space-y-2">
          {savedRisks.filter((r) => r.riskType === "other").length > 0 ? (
            savedRisks
              .filter((r) => r.riskType === "other")
              .map((risk) => (
                <li key={risk.id} className="p-3 border rounded bg-gray-50 text-sm">
                  <span className="font-medium">OTHER</span>:{" "}
                  <span>
                    <span className="text-purple-600">Target Date:</span>{" "}
                    {risk.date} — {risk.description}
                  </span>
                  <div className="text-gray-500 text-xs mt-1">
                    Added on {new Date(risk.timestamp).toLocaleDateString()}
                  </div>
                </li>
              ))
          ) : (
            <p className="text-sm text-gray-500">No other risks recorded yet.</p>
          )}
        </ul>
      )}
    </>
  ) : (
    <p className="text-sm text-gray-500">No risks recorded yet.</p>
  )}
</div>




      {/* Modal for adding risks */}
      {showModal && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-4xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Risk</h3>

            {/* Tabs */}
            <div className="flex border-b mb-4">
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "controls"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-600"
                  }`}
                onClick={() => setActiveTab("controls")}
              >
                Control Risks
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${activeTab === "others"
                  ? "border-b-2 border-purple-600 text-purple-600"
                  : "text-gray-600"
                  }`}
                onClick={() => setActiveTab("others")}
              >
                Others
              </button>
            </div>

            {/* Control Risks Tab */}
            {activeTab === "controls" && (
              <>
                {loading && <p className="text-sm text-gray-500">Loading controls…</p>}
                {error && <p className="text-sm text-red-600">{error}</p>}

                {!loading && !error && controls.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 text-sm text-left text-gray-700">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 border-b">CONTROL ID</th>
                          <th className="px-4 py-2 border-b">CONTROL DESCRIPTION</th>
                          <th className="px-4 py-2 border-b">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {controls.map((c, i) => (
                          <tr key={i} className="border-b">
                            <td className="px-4 py-2">{c["CONTROL ID"]}</td>
                            <td className="px-4 py-2 max-w-[400px] whitespace-normal">
                              {c["CONTROL DESCRIPTION"]}
                            </td>
                            <td className="px-4 py-2">
                              {editingControl === c["CONTROL ID"] ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={controlDescription}
                                    onChange={(e) => setControlDescription(e.target.value)}
                                    placeholder="Description"
                                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
                                  />
                                  <button
                                    onClick={() => handleSaveControlRisk(c)}
                                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                                    disabled={saving}
                                  >
                                    {saving ? "Saving…" : "Save"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleMarkRisk(c["CONTROL ID"])}
                                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                >
                                  Mark as Risk
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!loading && !error && controls.length === 0 && (
                  <p className="text-sm text-gray-500">No controls available.</p>
                )}
              </>
            )}

            {/* Others Tab */}
            {activeTab === "others" && (
              <div className="space-y-4">
                {otherRisks.map((risk, i) => (
                  <div key={i} className="relative space-y-3 border p-4 rounded-md">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = otherRisks.filter((_, idx) => idx !== i);
                        setOtherRisks(updated);
                      }}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      title="Remove risk"
                    >
                      ✕
                    </button>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Risk Description {i + 1}
                      </label>
                      <input
                        type="text"
                        value={risk.description}
                        onChange={(e) => handleOtherChange(i, "description", e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        placeholder="Enter risk description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Risk Type {i + 1}
                      </label>
                      <input
                        type="text"
                        value={risk.type}
                        onChange={(e) => handleOtherChange(i, "type", e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        placeholder="Enter risk type"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Target Date {i + 1}
                      </label>
                      <input
                        type="date"
                        value={risk.date}
                        onChange={(e) => handleOtherChange(i, "date", e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-between items-center mt-4">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-sm text-purple-600 underline"
                  >
                    + Add More
                  </button>
                  <button
                    onClick={handleMarkOtherRisk}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Mark as Risk"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-4 mt-6">
              <button
                type="button"
                className="text-sm text-gray-600"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
