"use client";
import { useEffect, useState } from "react";
import ManageControlModal from "./modal/ManageControlsModal"; // ⬅️ new modal (styled like ControlAssignmentModal)

export default function ManageControls({ sidebarOpen }) {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal
  const [manageOpen, setManageOpen] = useState(false);

  // Filters + pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [selectedGoal, setSelectedGoal] = useState("");
  const [selectedFunction, setSelectedFunction] = useState("");

  // Filter options (reuse in modal)
  const GOAL_TYPES = ["ANTICIPATE", "EVOLVE", "RECOVER", "WITHSTAND AND CONTAIN"];
  const FUNCTION_TYPES = ["DETECT", "EVOLVE", "GOVERNANCE", "IDENTIFY", "PROTECT", "RECOVER", "RESPOND"];

  const fetchControls = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/for-admin/get-controls");
      if (!res.ok) throw new Error("Failed to fetch controls");
      const data = await res.json();
      setControls(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching controls:", err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }

  };

  useEffect(() => {
    fetchControls();
  }, []);

  const totalControls = controls.length;


  // Filtering + pagination
  const filteredControls = controls.filter((c) => {
    const goalMatch = selectedGoal ? c.GOAL === selectedGoal : true;
    const functionMatch = selectedFunction ? c.FUNCTION === selectedFunction : true;
    return goalMatch && functionMatch;
  });

  const paginatedControls = filteredControls.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredControls.length / pageSize);


  const sourceRows = filteredControls.length > 0 ? filteredControls : controls;
  let headers =
    sourceRows.length > 0
      ? Object.keys(sourceRows[0]).filter(
        (key) =>
          key !== "_id" &&
          key !== "FINANCIAL YEAR" &&
          key !== "STANDARD" &&
          !key.startsWith("RE_") // remove all RE_* columns
      )
      : [];

  // Add our single "Applicable REs" column
  if (headers.length > 0) {
    headers.push("Applicable REs");
  }


  // Long fields
  const LONG_FIELD_NAMES = new Set([
    "SAMPLE EVIDANCES",
    "GUIDELINE",
    "COMPLIANCE GUIDANCE",
    "CONTROL DESCRIPTION",
  ]);
  const isLongField = (header) => LONG_FIELD_NAMES.has(header) || /SAMPLE/i.test(header);

  // Sample evidence list renderer
  const renderSampleEvidence = (raw) => {
    if (!raw || raw === "NA") return raw || "";
    const normalized = String(raw).replace(/\r?\n/g, " ").trim();
    const parts = normalized.split(/\s*\d+\)\s*/).filter(Boolean);
    if (parts.length <= 1) return null;
    return (
      <ol className="list-decimal pl-5 space-y-1 whitespace-normal">
        {parts.map((p, i) => (
          <li key={i}>{p.trim().replace(/\s+/g, " ")}</li>
        ))}
      </ol>
    );
  };

  const renderParagraphs = (text) => {
    const str = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!str) return null;
    const chunks = str
      .split(/(?:\.\s+|\n{1,}|\u2022\s+)/)
      .map((c) => c.trim())
      .filter(Boolean);
    return (
      <div className="whitespace-pre-wrap break-words break-all leading-5 space-y-1">
        {chunks.map((c, i) => (
          <p key={i}>{c}</p>
        ))}
      </div>
    );
  };

  // Modal handlers
  const handleAddClick = () => setManageOpen(true);
  const handleModalClose = () => setManageOpen(false);



  const handleModalSave = async (payload) => {

    setManageOpen(false);
    await fetchControls();
    setCurrentPage(1); 

  };

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className={`mt-4 transition-all duration-300 ${sidebarOpen ? "ml-[2px]" : "ml-4"} flex flex-col w-full`}>
        {/* Top controls */}
        <div className="flex flex-wrap gap-4 mb-3">
          <select className="border border-gray-300 rounded px-3 py-1 text-sm w-[160px]">
            <option>2025-2026</option>
          </select>

          <select
            className="border border-gray-300 rounded px-3 py-1 text-sm w-[160px]"
            value={selectedGoal}
            onChange={(e) => {
              setSelectedGoal(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Select Goal</option>
            {GOAL_TYPES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

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
              <option key={f} value={f}>{f}</option>
            ))}
          </select>


          <button
            onClick={handleAddClick}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-1.5 rounded"
          >
            + Add Control
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && filteredControls.length > 0 && (
          <>
            {/* Vertical scroll only */}
            <div className="flex-1 overflow-y-auto min-w-0" style={{ minHeight: "calc(200vh - 64px)" }}>
              <div className="rounded-lg border shadow-sm bg-white w-full">
                {/* Horizontal scroll for table only */}
                <div className="overflow-x-auto max-w-full block" style={{ WebkitOverflowScrolling: "touch" }}>
                  <div className="inline-block align-middle">
                    <table className="table-fixed min-w-[1200px] text-xs text-left text-gray-700">
                      <colgroup>
                        {headers.map((header) => {
                          const long =
                            header === "CONTROL DESCRIPTION" ||
                            header === "COMPLIANCE GUIDANCE" ||
                            /SAMPLE/i.test(header);
                          const width = long ? "420px" : header === "GOAL" || header === "FUNCTION" ? "120px" : "160px";
                          return <col key={header} style={{ width }} />;
                        })}
                      </colgroup>

                      <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                          {headers.map((header) => (
                            <th key={header} className="py-[2.5px] px-[6px] border-b border-gray-300 font-medium text-[#172B4D]">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedControls.map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-gray-200 align-top">
                            {headers.map((header) => {
                              if (header === "Applicable REs") {
                                const applicable = Object.keys(row)
                                  .filter((key) => key.startsWith("RE_") && row[key] === "YES")
                                  .map((key) => key.replace("RE_", "")); // MII, QUALIFIED, etc.

                                return (
                                  <td key={header} className="px-[6px] py-[2.5px] border-gray-200 align-top">
                                    {applicable.length > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        {applicable.map((re, i) => (
                                          <p key={i}>{re}</p>
                                        ))}
                                      </div>
                                    ) : (
                                      "—"
                                    )}
                                  </td>
                                );
                              }


                              const raw = row[header];
                              const value = typeof raw === "string" ? raw : String(raw ?? "");
                              const maybeList = /SAMPLE/i.test(header) ? renderSampleEvidence(value) : null;

                              return (
                                <td key={header} className="px-[6px] py-[2.5px] border-gray-200 align-top">
                                  <div className="whitespace-pre-wrap break-words break-all leading-5">
                                    {maybeList ? maybeList : isLongField(header) ? renderParagraphs(value) : value}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>

                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-start mt-4 gap-3">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-gray-200 hover:bg-gray-300 text-sm px-3 py-1 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
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
          <p className="text-gray-500">No control data available.</p>
        )}
      </div>


      <ManageControlModal
        open={manageOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        goalOptions={GOAL_TYPES}
        functionOptions={FUNCTION_TYPES}
        totalControls={totalControls}
      />
    </div>
  );
}
