"use client";
import { useEffect, useRef, useState } from "react";

export default function ManageControlModal({
    open,
    onClose,
    onSave,
    goalOptions = [],
    functionOptions = [],
    totalControls
}) {
    // enums / options (tweak as you need)
    const now = new Date();
    const fyStartYear = now.getFullYear();
    const CURRENT_FY = `${fyStartYear}-${fyStartYear + 1}`;

    // Single-option FY list to keep your existing select styling intact
    const YEAR_OPTIONS = [CURRENT_FY];
    const FREQUENCY_OPTIONS = ["Annual", "Quarterly", "Monthly", "Weekly", "Ad-hoc"];
    const BEGIN_END_OPTIONS = ["B", "E"];


    const nextControlId = `C${String((totalControls || 0) + 1).padStart(3, "0")}`;

    console.log(totalControls);
    const [form, setForm] = useState({
        controlId: "",
        financialYear: YEAR_OPTIONS[0] || "",
        goal: "",
        func: "",
        guideline: "",
        standard: "",
        controlDescription: "",
        complianceGuidance: "",
        sampleEvidences: "",
        frequency: FREQUENCY_OPTIONS[0] || "",
        beginningEndIndicator: "B",
        re_mii: "YES",
        re_qualified: "YES",
        re_mid_sized: "YES",
        re_small_sized: "YES",
        re_self_cert: "YES",
    });

    const [saving, setSaving] = useState(false);
    const firstInputRef = useRef(null);

    useEffect(() => {
        if (open) {
            // reset & focus first field
            setForm((prev) => ({
                ...prev,
                controlId: nextControlId,
                financialYear: YEAR_OPTIONS[0] || "",
                goal: "",
                func: "",
                guideline: "",
                standard: "",
                controlDescription: "",
                complianceGuidance: "",
                sampleEvidences: "",
                frequency: FREQUENCY_OPTIONS[0] || "",
                beginningEndIndicator: "B",
                re_mii: "YES",
                re_qualified: "YES",
                re_mid_sized: "YES",
                re_small_sized: "YES",
                re_self_cert: "YES",
            }));
            setTimeout(() => firstInputRef.current?.focus(), 0);
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => (document.body.style.overflow = "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, totalControls]);

    if (!open) return null;

    const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);

            // Build payload using your exact DB keys
            const payload = {
                "CONTROL ID": form.controlId.trim(),
                "FINANCIAL YEAR": form.financialYear,
                GOAL: form.goal,
                FUNCTION: form.func,
                GUIDELINE: form.guideline,
                STANDARD: form.standard,
                "CONTROL DESCRIPTION": form.controlDescription,
                "COMPLIANCE GUIDANCE": form.complianceGuidance,
                "SAMPLE EVIDANCES": form.sampleEvidences,
                FREQUENCY: form.frequency,
                BEGINNING_END_INDICATOR: form.beginningEndIndicator,
                RE_MII: form.re_mii,
                RE_QUALIFIED: form.re_qualified,
                RE_MID_SIZED: form.re_mid_sized,
                RE_SMALL_SIZED: form.re_small_sized,
                RE_SELF_CERT: form.re_self_cert,
            };

            // 🔹 Call API to save control
            const res = await fetch("/api/for-admin/add-control", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || "Failed to add control");
            }

            // Call parent handler if needed (to refresh list etc.)
            onSave?.(payload);

            // Close modal
            onClose();
        } catch (err) {
            console.error("❌ Error saving control:", err);
            alert(err.message || "Something went wrong while saving control");
        } finally {
            setSaving(false);
        }
    };



    // helper to toggle YES/NO from a checkbox
    const toggleYesNo = (key) => (e) =>
        setForm((f) => ({ ...f, [key]: e.target.checked ? "YES" : "NO" }));

    return (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex justify-center items-center z-50">
            <div className="bg-white w-full max-w-4xl rounded-lg shadow-lg p-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Add Control</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 text-sm">
                    {/* Row 1: ID / Year */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-semibold text-gray-600 mb-1">
                                Control ID
                            </label>
                            <input
                                ref={firstInputRef}
                                type="text"
                                className="w-full border border-gray-300 px-3 py-2 rounded"
                                placeholder="e.g., C009"
                                value={form.controlId}
                                onChange={update("controlId")}
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-gray-600 mb-1">
                                Financial Year
                            </label>
                            <select
                                className="w-full border border-gray-300 px-3 py-2 rounded"
                                value={form.financialYear}
                                onChange={update("financialYear")}
                                required
                            >
                                {YEAR_OPTIONS.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Goal / Function */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-semibold text-gray-600 mb-1">Goal</label>
                            <select
                                className="w-full border border-gray-300 px-3 py-2 rounded"
                                value={form.goal}
                                onChange={update("goal")}
                                required
                            >
                                <option value="">Select Goal</option>
                                {goalOptions.map((g) => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold text-gray-600 mb-1">
                                Function
                            </label>
                            <select
                                className="w-full border border-gray-300 px-3 py-2 rounded"
                                value={form.func}
                                onChange={update("func")}
                                required
                            >
                                <option value="">Select Function</option>
                                {functionOptions.map((f) => (
                                    <option key={f} value={f}>
                                        {f}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Guideline / Standard */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-semibold text-gray-600 mb-1">
                                Guideline
                            </label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 px-3 py-2 rounded"
                                placeholder='e.g., "ROLES, RESPONSIBILITIES AND AUTHORITIES"'
                                value={form.guideline}
                                onChange={update("guideline")}
                            />
                        </div>

                        <div>
                            <label className="block font-semibold text-gray-600 mb-1">
                                Standard
                            </label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 px-3 py-2 rounded"
                                placeholder='e.g., "GV.RR.S3"'
                                value={form.standard}
                                onChange={update("standard")}
                            />
                        </div>
                    </div>

                    {/* Descriptions */}
                    <div>
                        <label className="block font-semibold text-gray-600 mb-1">
                            Control Description
                        </label>
                        <textarea
                            className="w-full border border-gray-300 px-3 py-2 rounded h-24"
                            placeholder='e.g., "2. REs shall designate a senior official..."'
                            value={form.controlDescription}
                            onChange={update("controlDescription")}
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-semibold text-gray-600 mb-1">
                            Compliance Guidance
                        </label>
                        <textarea
                            className="w-full border border-gray-300 px-3 py-2 rounded h-24"
                            placeholder='e.g., "Appoint a Designated Officer with defined cybersecurity responsibilities."'
                            value={form.complianceGuidance}
                            onChange={update("complianceGuidance")}
                        />
                    </div>

                    <div>
                        <label className="block font-semibold text-gray-600 mb-1">
                            Sample Evidences
                        </label>
                        <textarea
                            className="w-full border border-gray-300 px-3 py-2 rounded h-24"
                            placeholder="1) Appointment letter ...   2) Job description ..."
                            value={form.sampleEvidences}
                            onChange={update("sampleEvidences")}
                        />
                    </div>

                    {/* Row 4: Frequency / Begin-End / Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-semibold text-gray-600 mb-1">
                                Frequency
                            </label>
                            <select
                                className="w-full border border-gray-300 px-3 py-2 rounded"
                                value={form.frequency}
                                onChange={update("frequency")}
                            >
                                {FREQUENCY_OPTIONS.map((f) => (
                                    <option key={f} value={f}>
                                        {f}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-semibold text-gray-600 mb-1">
                                Beginning / End Indicator
                            </label>
                            <select
                                className="w-full border border-gray-300 px-3 py-2 rounded"
                                value={form.beginningEndIndicator}
                                onChange={update("beginningEndIndicator")}
                            >
                                {BEGIN_END_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>

                    {/* Applicable REs (checkboxes instead of YES/NO selects) */}
                    <div>
                        <label className="block font-semibold text-gray-600 mb-1">
                            Applicable REs
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                            <label className="inline-flex items-center gap-2 border border-gray-300 rounded px-3 py-2">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={form.re_mii === "YES"}
                                    onChange={toggleYesNo("re_mii")}
                                />
                                <span className="text-gray-700">MII</span>
                            </label>

                            <label className="inline-flex items-center gap-2 border border-gray-300 rounded px-3 py-2">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={form.re_qualified === "YES"}
                                    onChange={toggleYesNo("re_qualified")}
                                />
                                <span className="text-gray-700">QUALIFIED</span>
                            </label>

                            <label className="inline-flex items-center gap-2 border border-gray-300 rounded px-3 py-2">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={form.re_mid_sized === "YES"}
                                    onChange={toggleYesNo("re_mid_sized")}
                                />
                                <span className="text-gray-700">MID_SIZED</span>
                            </label>

                            <label className="inline-flex items-center gap-2 border border-gray-300 rounded px-3 py-2">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={form.re_small_sized === "YES"}
                                    onChange={toggleYesNo("re_small_sized")}
                                />
                                <span className="text-gray-700">SMALL_SIZED</span>
                            </label>

                            <label className="inline-flex items-center gap-2 border border-gray-300 rounded px-3 py-2">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={form.re_self_cert === "YES"}
                                    onChange={toggleYesNo("re_self_cert")}
                                />
                                <span className="text-gray-700">SELF_CERT</span>
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-200 hover:bg-gray-300 text-sm text-gray-800 px-4 py-2 rounded"
                        >
                            Close
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm px-5 py-2 rounded"
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
