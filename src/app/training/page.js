"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function TrainingPage() {
  const params = useSearchParams();
  const email = params.get("email") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [questions, setQuestions] = useState([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [openDomains, setOpenDomains] = useState(() => new Set());
  const [openQuestions, setOpenQuestions] = useState(() => new Set());
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (!email) {
      setErr("Missing email in the URL.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(
          `/api/training/get-questions?email=${encodeURIComponent(email)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (data?.message === "Response already submitted") {
          setAlreadySubmitted(true);
          return;
        }

        const normalized = Array.isArray(data)
          ? data.map((q, i) => ({
              _idx: i,
              question: q.question ?? "(No question text provided)",
              a: q.options?.A ?? "",
              b: q.options?.B ?? "",
              c: q.options?.C ?? "",
              d: q.options?.D ?? "",
              number: q.number ?? q.questionNumber ?? i + 1,
            }))
          : [];

        setQuestions(normalized);
        setOpenDomains(new Set(["Questions"]));
      } catch (e) {
        console.error(e);
        setErr("Failed to load questions.");
      } finally {
        setLoading(false);
      }
    })();
  }, [email]);

  const total = questions.length;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  const toggleDomain = (key) =>
    setOpenDomains((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleQuestion = (idx) =>
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const onPick = (idx, choice) =>
    setAnswers((prev) => ({ ...prev, [idx]: choice }));

  const onSubmit = async () => {
    const payload = {
      email,
      responses: questions
        .map((q, i) => {
          const picked = answers[i];
          return picked
            ? { questionNumber: q.number ?? i + 1, selected: picked }
            : null;
        })
        .filter(Boolean),
    };

    try {
      const res = await fetch("/api/training/submit-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      alert(`Submitted! Saved ${data.count} response(s) for ${data.email}.`);
    } catch (e) {
      console.error(e);
      alert(e.message || "Failed to submit.");
    }
  };

  return (
    <main
      className="min-h-screen bg-white text-gray-900"
      style={{
        fontFamily: '"Segoe UI", "Roboto", "Inter", system-ui, sans-serif',
      }}
    >
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">
          Cybersecurity Awareness Training
        </h1>

        {loading && <p className="text-sm text-gray-600">Loading questions…</p>}
        {err && <p className="text-sm text-red-600">{err}</p>}

        {!loading && !err && alreadySubmitted && (
          <p className="text-green-700 font-medium">
            ✅ Response already submitted. Thank you!
          </p>
        )}

        {!loading && !err && !alreadySubmitted && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Answered:{" "}
                <span className="font-semibold">{answeredCount}</span> / {total}
              </p>
            </div>

            <section className="border rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b cursor-pointer"
                onClick={() => toggleDomain("Questions")}
                role="button"
                aria-expanded={openDomains.has("Questions")}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleDomain("Questions");
                  }
                }}
              >
                <h2 className="text-lg font-semibold">Questions</h2>

                <svg
                  className={`w-5 h-5 transition-transform ${
                    openDomains.has("Questions") ? "rotate-90" : ""
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

              {openDomains.has("Questions") && (
                <ul className="divide-y">
                  {questions.map((q, idx) => {
                    const qOpen = openQuestions.has(idx);
                    return (
                      <li key={idx} className="p-4">
                        <div className="flex gap-3 items-start">
                          <button
                            type="button"
                            onClick={() => toggleQuestion(idx)}
                            className="text-left flex-1"
                            aria-expanded={qOpen}
                            title="Show options"
                          >
                            <p className="font-medium">
                              {q.number ? `Q${q.number}. ` : `Q${idx + 1}. `}
                              {q.question}
                            </p>
                          </button>
                          <svg
                            className={`w-4 h-4 mt-1 shrink-0 transition-transform ${
                              qOpen ? "rotate-90" : ""
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
                          <div className="mt-3 ml-1 sm:ml-7 text-sm text-gray-700">
                            <div className="space-y-2">
                              {["a", "b", "c", "d"].map((k) => {
                                const label = {
                                  a: "A",
                                  b: "B",
                                  c: "C",
                                  d: "D",
                                }[k];
                                const text = q[k];
                                if (!text) return null;
                                return (
                                  <label
                                    key={k}
                                    className="flex items-start gap-2 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="radio"
                                      name={`q-${idx}`}
                                      className="mt-1"
                                      value={label}
                                      checked={answers[idx] === label}
                                      onChange={() => onPick(idx, label)}
                                    />
                                    <span>
                                      <span className="font-semibold mr-1">
                                        {label}.
                                      </span>
                                      {text}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <div className="mt-8">
              <button
                onClick={onSubmit}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Submit
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
