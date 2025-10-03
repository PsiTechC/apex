"use client";
import { useEffect, useState } from "react";
import ControlAssignmentModal from "@/components/ciso/modals/ControlAssignmentModal";
import Alert from "../utils/Alert";

export default function ControlAssignment({
  sidebarOpen,
  ciso_email,
  organizationType,
  ownerEmails,
  onRefresh,
  assignedMap,
}) {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("owner");
  const [alert, setAlert] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedControl, setSelectedControl] = useState(null);
  const [isReassign, setIsReassign] = useState(false);
  const [mappedMembers, setMappedMembers] = useState(ownerEmails || []);
  const [selectedStatus, setSelectedStatus] = useState("");


  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedFunction, setSelectedFunction] = useState("");

  // Hardcoded options



  const GOAL_TYPES = ["ANTICIPATE", "EVOLVE", "RECOVER", "WITHSTAND AND CONTAIN"];
  const FUNCTION_TYPES = [
    "DETECT",
    "EVOLVE",
    "GOVERNANCE",
    "IDENTIFY",
    "PROTECT",
    "RECOVER",
    "RESPOND",
  ];



  const pageSize = 20;

  const filteredControls = controls.filter((c) => {
    const goalMatch = selectedGoal ? c.GOAL === selectedGoal : true;
    const functionMatch = selectedFunction ? c.FUNCTION === selectedFunction : true;

    // ✅ Status filter
    const assignedOwners = assignedMap?.[c["CONTROL ID"]] || [];
    const statusMatch =
      selectedStatus === "assigned"
        ? assignedOwners.length > 0
        : selectedStatus === "pending"
          ? assignedOwners.length === 0
          : true;

    return goalMatch && functionMatch && statusMatch;
  });



  const paginatedControls = filteredControls.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredControls.length / pageSize);

  const handleAssignClick = async (controlRow) => {
    try {
      const controlId = controlRow["CONTROL ID"];
      const assignedOwners = assignedMap?.[controlId] || [];

      setMappedMembers(ownerEmails || []);
      setSelectedControl({
        controlId: controlRow["CONTROL ID"],
        description: controlRow["CONTROL DESCRIPTION"],
        guidance: controlRow["COMPLIANCE GUIDANCE"],
        goal: controlRow["GOAL"],
        function: controlRow["FUNCTION"],
        assignedOwners,
      });

      setAssignModalOpen(true);
      setIsReassign(assignedOwners.length > 0);
    } catch (err) {
      console.error("Error loading assigned members:", err);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);

    const res = await fetch("/api/ciso/add-owner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, cisoEmail: ciso_email }),
    });

    const result = await res.json();
    setModalLoading(false);

    if (res.ok) {
      setAlert({ type: "success", message: `${role === "owner" ? "Owner" : "IT Committee"} added successfully!` });
      setShowModal(false);
      setEmail("");
      setRole("owner");
    } else {
      setAlert({ type: "danger", message: result?.message || "Failed to add user." });
    }
  };

  useEffect(() => {
    if (!organizationType) return;

    fetch(`/api/ciso/get-controls?organizationType=${encodeURIComponent(organizationType)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch controls");
        return res.json();
      })
      .then((data) => {
        setControls(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching controls:", err);
        setError("Failed to load data.");
        setLoading(false);
      });
  }, [organizationType]);


  const sourceRows = filteredControls.length > 0 ? filteredControls : controls;
  const headers =
    sourceRows.length > 0
      ? Object.keys(sourceRows[0]).filter(
        (key) => key !== "_id" && key !== "FINANCIAL YEAR" && key !== "STANDARD"
      )
      : [];


  // turns "1) foo 2) bar 3) baz" into <ol><li>foo</li>...</ol>
  const renderSampleEvidence = (raw) => {
    if (!raw || raw === "NA") return raw || "";
    const normalized = String(raw).replace(/\r?\n/g, " ").trim();
    const parts = normalized.split(/\s*\d+\)\s*/).filter(Boolean); // split on 1) 2) 3)
    if (parts.length <= 1) return normalized; // couldn’t parse numbered points; show as-is

    return (
      <ol className="list-decimal pl-5 space-y-1 whitespace-normal">
        {parts.map((p, i) => (
          <li key={i}>{p.trim().replace(/\s+/g, " ")}</li>
        ))}
      </ol>
    );
  };


  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div
        className={`mt-4 transition-all duration-300 ${sidebarOpen ? "ml-[2px]" : "ml-4"} flex flex-col w-full`}
      >
        <div className="flex flex-wrap gap-4 mb-3">
          <select className="border border-gray-300 rounded px-3 py-1 text-sm w-[160px]">
            <option>2025-2026</option>
          </select>

          {/* Goal Filter */}
          <select
            className="border border-gray-300 rounded px-3 py-1 text-sm w-[160px]"
            value={selectedGoal}
            onChange={(e) => {
              setSelectedGoal(e.target.value);
              setCurrentPage(1); // reset to first page on filter change
            }}
          >
            <option value="">Select Goal</option>
            {GOAL_TYPES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Function Filter */}
          <select
            className="border border-gray-300 rounded px-3 py-1 text-sm w-[160px]"
            value={selectedFunction}
            onChange={(e) => {
              setSelectedFunction(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Select Function</option>
            {FUNCTION_TYPES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            className="border border-gray-300 rounded px-3 py-1 text-sm w-[160px]"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1); // reset page on filter change
            }}
          >
            <option value="">Select Status</option>
            <option value="assigned">Assigned</option>
            <option value="pending">Pending</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-1.5 rounded"
          >
            + Assign Owner/IT
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && filteredControls.length > 0 && (
          <>
            <div className="flex-1 overflow-y-auto" style={{ minHeight: "calc(200vh - 64px)" }}>
              <div className="rounded-lg border shadow-sm bg-white w-full">
                <div className="overflow-x-auto">
                  <table
                    className={`${sidebarOpen ? "min-w-[1170px]" : "min-w-[1400px]"
                      } text-sm text-left text-gray-700 whitespace-nowrap`}
                  >
                    <thead className="bg-gray-100 sticky top-0 z-10">
                      <tr>
                        {headers.map((header) => {
                          const minWidth =
                            header === "CONTROL DESCRIPTION" || header === "COMPLIANCE GUIDANCE" || header === "SAMPLE EVIDENCE"
                              ? "min-w-[200px]"
                              : header === "GOAL" || header === "FUNCTION"
                                ? "min-w-[10px]"
                                : "min-w-[20px]";
                          return (
                            <th
                              key={header}
                              className={`py-[2.5px] px-[6px] ${minWidth} border-b border-gray-300 font-medium text-[#172B4D]`}
                            >
                              {header}
                            </th>
                          );
                        })}
                        <th className="py-[2.5px] px-[6px] min-w-[100px] border-b border-gray-300 font-medium text-[#172B4D]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedControls.map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-b border-gray-200">
                          {headers.map((header) => {
                            let value = String(row[header] || "").replace(/\r\n/g, ", ");
                            const wrapText = (text, wordsPerLine = 6) =>
                              text
                                .split(" ")
                                .reduce((acc, word, idx) => {
                                  const lineIndex = Math.floor(idx / wordsPerLine);
                                  if (!acc[lineIndex]) acc[lineIndex] = [];
                                  acc[lineIndex].push(word);
                                  return acc;
                                }, [])
                                .map((line, i) => <div key={i}>{line.join(" ")}</div>);

                            const isLong =
                              header === "CONTROL DESCRIPTION" ||
                              header === "COMPLIANCE GUIDANCE" ||
                              header === "SAMPLE EVIDENCE"
                            const tdClass = `px-[6px] py-[2.5px] align-top border-gray-200 ${isLong ? "max-w-[320px] break-words whitespace-normal" : ""
                              }`;

                            return (
                              <td key={header} className={tdClass}>
                                {header === "SAMPLE EVIDENCE"
                                  ? renderSampleEvidence(value)
                                  : isLong
                                    ? <div className="leading-[1.1rem] space-y-0">{wrapText(value)}</div>
                                    : value}
                              </td>

                            );
                          })}
                          <td className="px-[6px] py-[2.5px] relative">
                            {assignedMap[row["CONTROL ID"]] &&
                              assignedMap[row["CONTROL ID"]].length > 0 ? (
                              <div
                                className="relative group w-[50px] h-8 cursor-pointer"
                                onClick={() => handleAssignClick(row)}
                              >
                                {assignedMap[row["CONTROL ID"]]
                                  .slice(0, 3)
                                  .map((entry, idx) => {
                                    const initials = entry.owner
                                      .split("@")[0]
                                      .split(/[._]/)
                                      .map((part) => part[0]?.toUpperCase())
                                      .join("")
                                      .slice(0, 2);
                                    const colors = ["bg-cyan-500 text-white", "bg-red-600 text-white"];
                                    return (
                                      <div
                                        key={idx}
                                        className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold
                                        border-2 border-white absolute ${colors[idx % colors.length]}
                                        ${idx === 0 ? "z-30 left-0" : idx === 1 ? "z-20 left-5" : "z-10 left-10"}`}
                                        title={`${entry.owner} - ${(entry.evidences || []).join(", ")}`}
                                      >
                                        {initials}
                                      </div>
                                    );
                                  })}
                                <div className="absolute left-0 top-9 hidden group-hover:block bg-gray-700 text-white text-[18px] px-2 py-[2px] rounded shadow">
                                  Reassign
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAssignClick(row)}
                                className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded"
                              >
                                Assign
                              </button>
                            )}

                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-start mt-4 gap-3">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}

        {!loading && filteredControls.length === 0 && (
          <p className="text-gray-500">No controls found.</p>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add Owner / IT</h3>
              <form onSubmit={handleAddSubmit} className="space-y-4">
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
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="owner">Control Owner</option>
                    <option value="it_committee">IT Committee</option>
                  </select>
                </div>
                {modalLoading ? (
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
                    >
                      Add
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {assignModalOpen && (
          <ControlAssignmentModal
            controlId={selectedControl?.controlId}
            members={mappedMembers}
            description={selectedControl?.description}
            guidance={selectedControl?.guidance}
            goal={selectedControl?.goal}
            function={selectedControl?.function}
            assignedOwners={selectedControl?.assignedOwners || []}
            mode={isReassign ? "reassign" : "assign"}
            onClose={() => setAssignModalOpen(false)}
            onRefresh={onRefresh}
            cisoEmail={ciso_email}
          />
        )}
      </div>

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

    </div>

  );
}
