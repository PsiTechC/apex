"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Alert from "@/components/utils/Alert";

export default function TrainingPage() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const testId = params.get("testId") || "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [questions, setQuestions] = useState([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const [openDomains, setOpenDomains] = useState(() => new Set());
  const [openQuestions, setOpenQuestions] = useState(() => new Set());
  const [answers, setAnswers] = useState({});
  const [emptyMsg, setEmptyMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);



  const fetchQuestions = async (emailArg, testIdArg) => {
    const qs = new URLSearchParams({ email: emailArg });
    if (testIdArg) qs.set("testId", testIdArg);
    const res = await fetch(`/api/training/get-questions?${qs.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  useEffect(() => {
    if (!email) {
      setErr("Missing email in the URL.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const qs = new URLSearchParams({ email });
        if (testId) qs.set("testId", testId);
        const res = await fetch(`/api/training/get-questions?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await fetchQuestions(email, testId);

        // If no questions are assigned for this link
        if (Array.isArray(data) && data.length === 0) {
          setEmptyMsg(
            "No questions are available for this link. Please open your training from the email you received and use only that link."
          );
          setQuestions([]);
          setReviewMode(false);
          setAlreadySubmitted(false);
          setOpenDomains(new Set());
          return; // stop here — nothing else to render
        }
        const looksLikeReviewArray =
          Array.isArray(data) && data.length > 0 && "correct" in data[0];

        // Old message (kept for safety):
        if (data?.message === "Response already submitted") {
          setAlreadySubmitted(true);
          setReviewMode(true);
          return;
        }

        const src = Array.isArray(data) ? data : [];
        const normalized = src.map((q, i) => ({
          _idx: i,
          displayNumber: i + 1,
          question: q.question ?? "(No question text provided)",
          a: q.options?.A ?? "",
          b: q.options?.B ?? "",
          c: q.options?.C ?? "",
          d: q.options?.D ?? "",
          number: q.number ?? q.questionNumber ?? i + 1,
          // present only in review mode
          correct: q.correct ?? null,
          selected: q.selected ?? null,
        }));

        setReviewMode(looksLikeReviewArray);
        setAlreadySubmitted(looksLikeReviewArray);

        setQuestions(normalized);
        setOpenDomains(new Set(["Questions"]));
        if (looksLikeReviewArray) {
          // expand all questions in review mode (optional)
          setOpenQuestions(new Set(normalized.map((_, i) => i)));
        }
      } catch (e) {
        console.error(e);
        setErr("Failed to load questions.");
      } finally {
        setLoading(false);
      }
    })();
  }, [email, testId]);

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
    setSubmitting(true);
    const payload = {
      email,
      ...(testId ? { testId } : {}),
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
      setAlert({
        type: "success",
        message: `Submitted! Saved ${data.count} response(s) for ${data.email}.`,
      });
      const refreshed = await fetchQuestions(email, testId);
      // Reuse the SAME normalization + state logic you already have:
      const looksLikeReviewArray =
        Array.isArray(refreshed) && refreshed.length > 0 && "correct" in refreshed[0];
      const src = Array.isArray(refreshed) ? refreshed : [];
      const normalized = src.map((q, i) => ({
        _idx: i,
        displayNumber: i + 1,
        question: q.question ?? "(No question text provided)",
        a: q.options?.A ?? "",
        b: q.options?.B ?? "",
        c: q.options?.C ?? "",
        d: q.options?.D ?? "",
        number: q.number ?? q.questionNumber ?? i + 1,
        correct: q.correct ?? null,
        selected: q.selected ?? null,
      }));
      setQuestions(normalized);
      setReviewMode(looksLikeReviewArray);
      setAlreadySubmitted(looksLikeReviewArray);
      setOpenDomains(new Set(["Questions"]));
      if (looksLikeReviewArray) {
        setOpenQuestions(new Set(normalized.map((_, i) => i)));
      }
    } catch (e) {
      console.error(e);
      setAlert({
        type: "danger",
        message: e.message || "Failed to submit.",
      });
    } finally {
      setSubmitting(false);
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
        {!loading && !err && !!emptyMsg && (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
            {emptyMsg}
          </div>
        )}


        {!loading && !err && !emptyMsg && (
          <>
            {!reviewMode && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Answered: <span className="font-semibold">{answeredCount}</span> / {total}
                </p>
              </div>
            )}

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
                <h2 className="text-lg font-semibold">
                  {reviewMode ? "Your Answers (Review)" : "Questions"}
                </h2>
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
                              {`Q${idx + 1}. `}
                              {q.question}
                            </p>
                          </button>
                          <svg
                            className={`w-4 h-4 mt-1 shrink-0 transition-transform ${qOpen ? "rotate-90" : ""}`}
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
                                const label = { a: "A", b: "B", c: "C", d: "D" }[k];
                                const text = q[k];
                                if (!text) return null;

                                // Review-mode styling:
                                const isCorrect = reviewMode && q.correct === label;
                                const isSelected = reviewMode && q.selected === label;
                                const wrongSelection = reviewMode && isSelected && !isCorrect;

                                const base =
                                  "flex items-start gap-2 cursor-pointer rounded border px-3 py-2";
                                const reviewClass = reviewMode
                                  ? isCorrect
                                    ? "border-green-400 bg-green-50 text-green-800"
                                    : wrongSelection
                                      ? "border-red-400 bg-red-50 text-red-800"
                                      : "border-gray-200 bg-white text-gray-700"
                                  : "border-gray-200 bg-white text-gray-700";

                                return (
                                  <label
                                    key={k}
                                    className={base + " " + reviewClass}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {!reviewMode && (
                                      <input
                                        type="radio"
                                        name={`q-${idx}`}
                                        className="mt-1"
                                        value={label}
                                        checked={answers[idx] === label}
                                        onChange={() => onPick(idx, label)}
                                      />
                                    )}
                                    <span className="select-none">
                                      <span className="font-semibold mr-1">{label}.</span>
                                      {text}
                                      {reviewMode && isCorrect && (
                                        <span className="ml-2 font-medium">(correct)</span>
                                      )}
                                      {reviewMode && wrongSelection && (
                                        <span className="ml-2 font-medium">(submitted)</span>
                                      )}
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

            {!reviewMode && (
              <div className="mt-8">
                <button
                  onClick={onSubmit}
                  disabled={submitting}
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </div>
            )}
          </>
        )}

      </div>
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-5 shadow-lg">
            <svg
              className="h-8 w-8 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="text-sm text-gray-700">Submitting…</p>
          </div>
        </div>
      )}

      {alert && (
        <Alert
          type={alert.type}              // 'success' | 'warning' | 'danger'
          message={alert.message}
          onClose={() => setAlert(null)} // auto-closes in 4s (non-confirm)
        />
      )}
    </main>
  );
}
