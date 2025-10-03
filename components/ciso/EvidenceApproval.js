"use client";

import { useEffect, useState, useCallback } from "react";
import EvidenceViewModal from "@/components/ciso/modals/EvidenceViewModal"; // adjust path as needed


export default function EvidenceApproval({ sidebarOpen, ownerEmails }) {
  const [pendingControls, setPendingControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState([]);
  const [selectedControlDetails, setSelectedControlDetails] = useState({});



  const fetchPendingControls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/ciso/get-pending-controls?email=${encodeURIComponent(ownerEmails)}`);
      if (!res.ok) throw new Error("Failed to fetch pending controls");
      const data = await res.json();
      setPendingControls(data.assignedControls || []);
    } catch (err) {
      setError("Failed to load pending controls");
      console.error("❌ Error:", err);
    } finally {
      setLoading(false);
    }
  }, [ownerEmails]);

  useEffect(() => {
    if (ownerEmails) fetchPendingControls();
  }, [ownerEmails, fetchPendingControls]);


  return (
    <div className="h-full w-full bg-white overflow-x-hidden flex flex-col">
      <div
        className={`mt-4 transition-all duration-300 ${sidebarOpen ? "ml-[2px]" : "ml-4"} flex flex-col`}
        style={{ width: sidebarOpen ? "calc(100vw - 220px)" : "100vw" }}
      >
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && pendingControls.length === 0 && (
          <p className="text-gray-500">No pending controls found.</p>
        )}

        {!loading && pendingControls.length > 0 && (
          <div className="rounded-lg border shadow-sm bg-white w-full">
            <div className="overflow-x-auto">
              <table className={`${sidebarOpen ? "min-w-[1200px]" : "min-w-[1400px]"} text-sm text-left text-gray-700 whitespace-nowrap`}>
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="py-[2.5px] px-[6px] border-b border-gray-300 font-medium text-[#172B4D]">Control ID</th>
                    <th className="py-[2.5px] px-[6px] border-b border-gray-300 font-medium text-[#172B4D]">Goal</th>
                    <th className="py-[2.5px] px-[6px] border-b border-gray-300 font-medium text-[#172B4D]">Function</th>
                    <th className="py-[2.5px] px-[6px] border-b border-gray-300 font-medium text-[#172B4D] min-w-[200px]">Description</th>
                    <th className="py-[2.5px] px-[6px] border-b border-gray-300 font-medium text-[#172B4D] min-w-[200px]">Guidance</th>
                    <th className="py-[2.5px] px-[6px] border-b border-gray-300 font-medium text-[#172B4D]">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingControls.map((control, rowIdx) => (
                    <tr key={control.controlId + rowIdx} className="border-b border-gray-200 align-top">
                      <td className="px-[6px] py-[2.5px]">{control.controlId}</td>
                      <td className="px-[6px] py-[2.5px]">{control.goal}</td>
                      <td className="px-[6px] py-[2.5px]">{control.function}</td>
                      <td className="px-[6px] py-[2.5px] max-w-[320px] break-words leading-[1.1rem] space-y-0">
                        {wrapText(control.description)}
                      </td>
                      <td className="px-[6px] py-[2.5px] max-w-[320px] break-words leading-[1.1rem] space-y-0">
                        {wrapText(control.guidance)}
                      </td>
                      <td className="px-[6px] py-[2.5px]">
                        <button
                          onClick={() => {
                            setSelectedEvidence(control.evidences);
                            setSelectedControlDetails({
                              controlId: control.controlId,
                              goal: control.goal,
                              function: control.function,
                              description: control.description,
                              guidance: control.guidance,
                            });
                            setViewModalOpen(true);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded"
                        >
                          View
                        </button>


                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <EvidenceViewModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            fetchPendingControls(); 
          }}
          evidenceList={selectedEvidence}
          controlDetails={selectedControlDetails}
        />

      </div>
    </div>
  );

  function wrapText(value, wordsPerLine = 6) {
    const text = (typeof value === "string" ? value : String(value ?? "")).trim();
    if (!text) return <span className="text-gray-400">—</span>;
  
    return text
      .split(/\s+/) // safer than " "
      .reduce((acc, word, idx) => {
        const lineIdx = Math.floor(idx / wordsPerLine);
        if (!acc[lineIdx]) acc[lineIdx] = [];
        acc[lineIdx].push(word);
        return acc;
      }, [])
      .map((line, i) => <div key={i}>{line.join(" ")}</div>);
  }
  
}
