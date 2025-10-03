"use client";

import { useState, useEffect } from "react";


export default function EvidenceViewModal({
  isOpen,
  onClose,
  evidenceList = [],
  controlDetails = {},
}) {
  const [commentModes, setCommentModes] = useState([]);
  const [fileActions, setFileActions] = useState([]);
  const [fileComments, setFileComments] = useState([]);
  const [activeIndexes, setActiveIndexes] = useState([]);
  const [isRiskMode, setIsRiskMode] = useState(false);
  const [riskComment, setRiskComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  useEffect(() => {
    if (isOpen) {
      setActiveIndexes(evidenceList.map(() => 0));
      setCommentModes(evidenceList.map(() => null));
      setFileActions(evidenceList.map(ev => ev.files.map(() => null)));
      setFileComments(evidenceList.map(ev => ev.files.map(() => "")));
    }
  }, [evidenceList, isOpen]);

  const handleAction = (eIdx, fIdx, action) => {
    setFileActions(prev =>
      prev.map((ev, i) =>
        i === eIdx ? ev.map((status, j) => (j === fIdx ? action : status)) : ev
      )
    );
  };

  const handleCommentChange = (eIdx, fIdx, value) => {
    setFileComments(prev =>
      prev.map((ev, i) =>
        i === eIdx ? ev.map((comment, j) => (j === fIdx ? value : comment)) : ev
      )
    );
  };

  const handleFileSwitch = (eIdx, fIdx) => {
    setActiveIndexes(prev =>
      prev.map((val, idx) => (idx === eIdx ? fIdx : val))
    );
  };

  const toggleCommentMode = (eIdx) => {
    setCommentModes(prev =>
      prev.map((val, idx) => (idx === eIdx ? (val ? null : "reject") : val))
    );
  };

  const submitAction = async (eIdx, fIdx, actionOverride = null) => {
    const file = evidenceList[eIdx].files[fIdx];

    const action = actionOverride || (isRiskMode ? "risk" : fileActions[eIdx][fIdx]);
    const comment = isRiskMode
      ? riskComment
      : fileComments[eIdx][fIdx];

    if (!action) return alert("Please select an action first.");

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/ciso/approve-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          controlLinks: [file.url],
          action,
          comment: action === "rejected" || action === "risk" ? comment : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update status");

      setIsRiskMode(false);
      setRiskComment("");
      onClose();
    } catch (err) {
      console.error("Error submitting action:", err);
      alert("❌ Failed to submit action.");
    } finally {
      setIsSubmitting(false); // ✅ End loading
    }
  };



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          View Evidence Files
        </h2>

        <div className="absolute top-4 right-6">
          {!isRiskMode ? (
            <button
              onClick={() => setIsRiskMode(true)}
              className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs px-3 py-1 rounded border border-yellow-300"
            >
              ⚠️ Mark as Risk
            </button>
          ) : (
            <button
              onClick={() => {
                setIsRiskMode(false);
                setRiskComment("");
              }}
              className="text-sm text-red-500 underline"
            >
              Cancel Risk
            </button>
          )}
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
          <div>
            <label className="block font-semibold text-gray-600 mb-1">Financial Year</label>
            <input type="text" value="2025–2026" readOnly className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block font-semibold text-gray-600 mb-1">Goal</label>
            <input type="text" value={controlDetails.goal || "-"} readOnly className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100" />
          </div>
          <div>
            <label className="block font-semibold text-gray-600 mb-1">Function</label>
            <input type="text" value={controlDetails.function || "-"} readOnly className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100" />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-600 mb-1">Control Description</label>
          <textarea readOnly value={controlDetails.description || "-"} rows={3} className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-sm" />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-600 mb-1">Compliance Guidance</label>
          <textarea readOnly value={controlDetails.guidance || "-"} rows={3} className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 text-sm" />
        </div>

        {/* Evidence List */}
        <div className="space-y-6">
          {evidenceList.map((evidence, eIdx) => {
            const currentFile = evidence.files?.[activeIndexes[eIdx]];

            return (
              <div key={eIdx} className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 mb-2 text-sm">
                  <div>
                    <label className="block font-semibold text-gray-600 mb-1">Evidence Name</label>
                    <input type="text" value={evidence.name || "-"} readOnly className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100" />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-600 mb-1">Frequency</label>
                    <input type="text" value={evidence.frequency || "-"} readOnly className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100" />
                  </div>
                </div>

                <div className="mb-4 flex flex-col items-center gap-3">
                  {currentFile ? (
                    <a
                      href={currentFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-block px-4 py-2 rounded transition text-sm font-medium border
        ${currentFile.status === "approved"
                          ? "bg-green-50 text-green-700 border-green-300 hover:bg-green-100"
                          : currentFile.status === "rejected"
                            ? "bg-yellow-50 text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                            : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                        }`}
                    >
                      📄 {currentFile.fileName}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">No files uploaded yet.</p>
                  )}

                  <div className="w-full">
                    {currentFile?.status === "approved" && (
                      <div className="text-green-700 text-sm font-medium mt-2">
                        ✅ Document approved
                      </div>
                    )}

                    {currentFile?.status === "rejected" && (
                      <div className="text-yellow-700 text-sm font-medium mt-2">
                        ⚠️ Owner didn’t update the document
                      </div>
                    )}

                    {currentFile?.status === "pending" && !isRiskMode && (
                      <>
                        {/* Approve & Reject buttons */}
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => {
                              submitAction(eIdx, activeIndexes[eIdx], "approved");
                            }}
                            className="bg-green-100 hover:bg-green-200 text-green-800 text-xs px-3 py-1 rounded border border-green-300"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => {
                              toggleCommentMode(eIdx);
                              handleAction(eIdx, activeIndexes[eIdx], "rejected");
                            }}
                            className="bg-red-100 hover:bg-red-200 text-red-800 text-xs px-3 py-1 rounded border border-red-300"
                          >
                            Reject
                          </button>
                        </div>

                        {commentModes[eIdx] === "reject" && (
                          <textarea
                            value={fileComments[eIdx][activeIndexes[eIdx]]}
                            onChange={(e) =>
                              handleCommentChange(eIdx, activeIndexes[eIdx], e.target.value)
                            }
                            placeholder="Enter reason for rejection..."
                            rows={3}
                            className="w-full text-sm border border-red-300 rounded px-3 py-2 bg-red-50"
                          />
                        )}
                      </>
                    )}

                    {isRiskMode && (
                      <textarea
                        value={riskComment}
                        onChange={(e) => setRiskComment(e.target.value)}
                        placeholder="Describe the risk for this evidence file..."
                        rows={3}
                        className="w-full text-sm border border-yellow-300 rounded px-3 py-2 bg-yellow-50"
                      />
                    )}
                  </div>
                </div>


              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-between items-center">
          {evidenceList.length > 0 && evidenceList[0].files.length > 1 && (
            <div className="flex justify-center w-full ml-10">
              <div className="flex gap-2">
                {evidenceList[0].files.map((_, fIdx) => {
                  const freq = evidenceList[0].frequency?.toLowerCase();
                  let label = `${fIdx + 1}`;
                  if (freq === "monthly") {
                    label = `Month ${fIdx + 1}`;
                  } else if (freq === "quarterly") {
                    label = `Q${fIdx + 1}`;
                  } else {
                    label = `Document`;
                  }

                  return (
                    <button
                      key={fIdx}
                      className={`px-3 py-1 rounded text-sm border ${activeIndexes[0] === fIdx
                          ? "bg-blue-600 text-white"
                          : "bg-white text-gray-700 border-gray-300"
                        }`}
                      onClick={() => handleFileSwitch(0, fIdx)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}


          {isSubmitting ? (
            <div className="ml-auto flex items-center justify-center px-4 py-2">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <button
              onClick={() => {
                const eIdx = 0;
                const fIdx = activeIndexes[0];
                if (isRiskMode || commentModes[0] === "reject") {
                  submitAction(eIdx, fIdx);
                } else {
                  onClose();
                }
              }}
              className={`ml-auto text-sm px-4 py-2 rounded
        ${isRiskMode
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : commentModes[0] === "reject"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-gray-500 hover:bg-gray-600 text-white"
                }
      `}
            >
              {isRiskMode
                ? "Submit Risk"
                : commentModes[0] === "reject"
                  ? "Reject"
                  : "Close"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
