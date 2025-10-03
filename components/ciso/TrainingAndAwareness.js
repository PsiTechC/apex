"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Alert from "../utils/Alert";

export default function TrainingAndAwareness({ ciso_email }) {
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openDomains, setOpenDomains] = useState(() => new Set());
  const [openQuestions, setOpenQuestions] = useState(() => new Set());
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState(null); // ← use Alert component
  const fileRef = useRef(null);
  const LIMIT = 100;

  const showAlert = (type, message) => setAlert({ type, message });

  useEffect(() => {
    fetch("/api/ciso/get-questions", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const normalized = Array.isArray(data)
          ? data.map((q, i) => ({
            _idx: i,
            id: q._id ?? i,
            domain: q.Domain ?? q.domain ?? "General",
            question: q.Question ?? q.question ?? "",
            a: q["Option A"] ?? q.optionA ?? "",
            b: q["Option B"] ?? q.optionB ?? "",
            c: q["Option C"] ?? q.optionC ?? "",
            d: q["Option D"] ?? q.optionD ?? "",
            correct: q["Correct Answer"] ?? q.correct ?? "",
          }))
          : [];
        setQuestions(normalized);
        if (normalized.length > 0) {
          const firstDomain = normalized[0].domain || "General";
          setOpenDomains(new Set([firstDomain]));
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error("Failed to load questions:", e);
        setErr("Could not load questions.");
        setQuestions([]);
        setLoading(false);
      });
  }, []);

  const byDomain = useMemo(() => {
    const map = new Map();
    for (const q of questions) {
      const d = q.domain || "General";
      if (!map.has(d)) map.set(d, []);
      map.get(d).push(q);
    }
    return map;
  }, [questions]);

  const handleAssignClick = () => {
    // Button is disabled when none selected, but keep this guard anyway
    if (selected.size === 0 || uploading) return;
    fileRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ciso_email) {
      showAlert("danger", "No CISO email provided.");
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);

      // Selected question numbers (1-based)
      const selectedQuestions = Array.from(selected).map((i) => i + 1);

      const fd = new FormData();
      fd.append("email", ciso_email);
      fd.append("file", file);
      fd.append("questions", JSON.stringify(selectedQuestions));

      const res = await fetch("/api/ciso/assign-questions", {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Upload failed (HTTP ${res.status})`);
      }

      showAlert(
        "success",
        `Uploaded! Emails added: ${data.addedEmailsCount ?? "OK"} • Questions saved: ${data.addedQuestionsCount ?? 0}`
      );
    } catch (err) {
      console.error(err);
      showAlert("danger", err.message || "Failed to upload CSV.");
    } finally {
      setUploading(false);
      e.target.value = ""; // reset input
    }
  };

  const toggle = (idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else {
        if (next.size >= LIMIT) return next;
        next.add(idx);
      }
      return next;
    });
  };

  const toggleDomain = (domain) => {
    setOpenDomains((prev) => {
      const next = new Set(prev);
      next.has(domain) ? next.delete(domain) : next.add(domain);
      return next;
    });
  };

  const toggleQuestion = (idx) => {
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const selectAllInDomain = (domain) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const list = byDomain.get(domain) ?? [];
      for (const q of list) {
        if (next.size >= LIMIT && !next.has(q._idx)) break;
        next.add(q._idx);
      }
      return next;
    });
  };

  const clearDomain = (domain) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const list = byDomain.get(domain) ?? [];
      for (const q of list) next.delete(q._idx);
      return next;
    });
  };

  const onSubmit = () => {
    const count = Array.from(selected).length;
    showAlert("success", `Submitted ${count} question${count === 1 ? "" : "s"}.`);
  };

  return (
    <div
      className="max-w-5xl mx-auto p-6"
      style={{ fontFamily: '"Segoe UI", "Roboto", "Inter", system-ui, sans-serif' }}
    >
      {loading && <p className="text-sm text-gray-500">Loading questions…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && !err && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Selected: <span className="font-semibold">{selected.size}</span> / {LIMIT}
            </p>

            <div className="flex items-center gap-2">
              <div className="relative group inline-block mt-7">
                <button
                  onClick={handleAssignClick}
                  disabled={uploading || selected.size === 0}
                  className="text-sm px-3 py-1.5 rounded border bg-white hover:bg-gray-50 disabled:opacity-60"
                >
                  {uploading ? "Uploading..." : "Assign questions"}
                </button>

                {/* Tooltip */}
                {selected.size === 0 && !uploading && (
                  <span className="absolute left-1/2 -translate-x-1/2 mt-2 w-max px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    Please select a question before uploading
                  </span>
                )}

                {/* 🔹 Moved link just below the button */}
                <div className="mt-1">
                  <a
                    href="/sample_csv.csv"
                    download
                    className="text-xs text-blue-600 underline hover:text-blue-800"
                  >
                    Download sample CSV file
                  </a>
                </div>
              </div>

              <button
                onClick={() => setSelected(new Set())}
                className="text-sm px-3 py-1.5 rounded border bg-white hover:bg-gray-50"
              >
                Clear all
              </button>
            </div>

          </div>

          <div className="space-y-4">
            {Array.from(byDomain.keys()).map((domain) => {
              const isOpen = openDomains.has(domain);
              const items = byDomain.get(domain) ?? [];
              return (
                <section key={domain} className="border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b cursor-pointer"
                    onClick={() => toggleDomain(domain)}
                    role="button"
                    aria-expanded={isOpen}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleDomain(domain);
                      }
                    }}
                  >
                    <h2 className="text-lg font-semibold">{domain}</h2>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectAllInDomain(domain);
                        }}
                        className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-100"
                      >
                        Select all in this domain
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearDomain(domain);
                        }}
                        className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-100"
                      >
                        Clear
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDomain(domain);
                        }}
                        aria-expanded={isOpen}
                        className="p-1 hover:bg-gray-100 rounded"
                        title={isOpen ? "Collapse" : "Expand"}
                      >
                        <svg
                          className={`w-5 h-5 transition-transform ${isOpen ? "rotate-90" : ""}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <ul className="divide-y">
                      {items.map((q) => {
                        const checked = selected.has(q._idx);
                        const qOpen = openQuestions.has(q._idx);
                        return (
                          <li key={q._idx} className="p-4">
                            <div className="flex gap-3">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 shrink-0"
                                checked={checked}
                                onChange={() => toggle(q._idx)}
                                title="Select this question"
                              />
                              <button
                                type="button"
                                onClick={() => toggleQuestion(q._idx)}
                                className="text-left flex-1"
                                aria-expanded={qOpen}
                                title="Show options & answer"
                              >
                                <p className="font-medium">{q.question}</p>
                              </button>
                              <svg
                                className={`w-4 h-4 mt-1 shrink-0 transition-transform ${qOpen ? "rotate-90" : ""
                                  }`}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>

                            {qOpen && (
                              <div className="mt-3 ml-7 text-sm text-gray-700">
                                <ul className="list-disc pl-5 space-y-1">
                                  {q.a && (
                                    <li>
                                      <strong>A:</strong> {q.a}
                                    </li>
                                  )}
                                  {q.b && (
                                    <li>
                                      <strong>B:</strong> {q.b}
                                    </li>
                                  )}
                                  {q.c && (
                                    <li>
                                      <strong>C:</strong> {q.c}
                                    </li>
                                  )}
                                  {q.d && (
                                    <li>
                                      <strong>D:</strong> {q.d}
                                    </li>
                                  )}
                                </ul>
                                {q.correct && (
                                  <p className="mt-2">
                                    <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">
                                      Correct: {q.correct}
                                    </span>
                                  </p>
                                )}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelected}
          />
        </>
      )}

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}
