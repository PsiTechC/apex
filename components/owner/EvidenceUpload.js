
"use client";

import { useEffect, useState } from "react";
import UploadModal from "@/components/owner/UploadModal";


export default function EvidenceUpload({ sidebarOpen, owner_email }) {
    const [assignedControls, setAssignedControls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedEvidence, setSelectedEvidence] = useState(null);

    const fetchAssignedControls = async () => {
        try {
            const res = await fetch(`/api/owner/get-assigned-controls?email=${encodeURIComponent(owner_email)}`);
            if (!res.ok) throw new Error("Failed to fetch assigned controls");
            const data = await res.json();
            const sortedControls = (data.assignedControls || []).sort((a, b) => {
                const numA = parseInt(a.controlId?.replace(/\D/g, ""), 10);
                const numB = parseInt(b.controlId?.replace(/\D/g, ""), 10);
                return numA - numB;
            });
            setAssignedControls(sortedControls);
        } catch (err) {
            setError("Failed to load assigned controls");
            console.error("❌ Error loading assigned controls:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (owner_email) {
            fetchAssignedControls();
        }
    }, [owner_email]);



    const groupByControlId = () => {
        const grouped = {};
        assignedControls.forEach((control) => {
            const { controlId, description, guidance, goal, function: func, evidences = [], status } = control;
            if (!grouped[controlId]) {
                grouped[controlId] = { description, guidance, goal, function: func, evidences: [], status };
            }
            grouped[controlId].evidences.push(...evidences);
        });
        return grouped;
    };

    const controlMap = groupByControlId();

    const handleUploadClick = (controlId, controlData, evidence) => {
        setSelectedEvidence({ controlId, ...controlData, evidence });
        setShowModal(true);
    };

    const filteredControls = assignedControls.filter(control => control.status !== "risk");

    return (
        <div className="h-full w-full bg-white overflow-x-hidden flex flex-col">
            <div
                className={`mt-4 transition-all duration-300 ${sidebarOpen ? "ml-[2px]" : "ml-4"} flex flex-col`}
                style={{ width: sidebarOpen ? "calc(100vw - 220px)" : "100vw" }}
            >
                {loading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!loading && filteredControls.length === 0 && (
                    <p className="text-gray-500">No assigned controls found.</p>
                )}

                {!loading && filteredControls.length > 0 && (
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
                                        <th className="py-[2.5px] px-[6px] border-b border-gray-300 font-medium text-[#172B4D]">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredControls.map((control, rowIdx) =>
                                        control.evidences
                                            .filter(evi => control.status !== "risk") // ⛔ Skip control if status is 'risk'
                                            .map((evi, idx) => {

                                                const isRejected = evi.files?.some(f => f.status === "rejected");
                                                const wrapText = (value, wordsPerLine = 6) => {
                                                  // Normalize to a trimmed string; handle null/undefined/non-strings
                                                  const text = (typeof value === "string" ? value : String(value ?? "")).trim();
                                                  if (!text) return <span className="text-gray-400">—</span>;
                                                
                                                  return text
                                                    .split(/\s+/) // safer split
                                                    .reduce((acc, word, index) => {
                                                      const lineIdx = Math.floor(index / wordsPerLine);
                                                      if (!acc[lineIdx]) acc[lineIdx] = [];
                                                      acc[lineIdx].push(word);
                                                      return acc;
                                                    }, [])
                                                    .map((line, i) => <div key={i}>{line.join(" ")}</div>);
                                                };
                                                

                                                return (
                                                    <tr key={`${control.controlId}_${idx}`} className="border-b border-gray-200 align-top">
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
                                                            {(() => {
                                                                const uploadedFiles = evi.files?.filter(f => f.status)?.length || 0;
                                                                const totalExpectedFiles =
                                                                    evi.frequency.toLowerCase() === "monthly"
                                                                        ? 12
                                                                        : evi.frequency.toLowerCase() === "quarterly"
                                                                            ? 4
                                                                            : 1;

                                                                const allApproved = evi.files?.length === totalExpectedFiles && evi.files.every(f => f.status === "approved");
                                                                const hasRejected = evi.files?.some(f => f.status === "rejected");
                                                                const hasAnyFile = evi.files?.length > 0;

                                                                if (allApproved) {
                                                                    return (
                                                                        <span className="text-xs px-3 py-1 rounded bg-green-100 text-green-800 font-medium border border-green-300">
                                                                            Approved
                                                                        </span>
                                                                    );
                                                                }

                                                                return (
                                                                    <button
                                                                        onClick={() =>
                                                                            handleUploadClick(control.controlId, {
                                                                                goal: control.goal,
                                                                                function: control.function,
                                                                                description: control.description,
                                                                                guidance: control.guidance,
                                                                            }, evi)
                                                                        }
                                                                        className={`text-xs px-3 py-1 rounded font-medium border transition ${hasRejected
                                                                            ? "bg-red-100 text-red-700 border-red-300 hover:bg-red-200"
                                                                            : hasAnyFile
                                                                                ? "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
                                                                                : "bg-green-600 text-white hover:bg-green-700"
                                                                            }`}
                                                                    >
                                                                        {hasRejected ? "Changes Needed" : hasAnyFile ? "View/Upload" : "Upload"}
                                                                    </button>
                                                                );
                                                            })()}
                                                        </td>


                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {showModal && selectedEvidence && (
                    <UploadModal
                        controlId={selectedEvidence.controlId}
                        goal={selectedEvidence.goal}
                        function={selectedEvidence.function}
                        description={selectedEvidence.description}
                        guidance={selectedEvidence.guidance}
                        evidence={selectedEvidence.evidence}
                        email={owner_email}
                        onClose={async () => {
                            await fetchAssignedControls();
                            setShowModal(false);
                            setSelectedEvidence(null);
                        }}
                    />
                )}
            </div>
        </div>
    );


}