"use client";

import { useEffect, useMemo, useState, useRef } from "react";

export default function Dashboard({ ownerEmails = [], organizationType, setSelectedTab }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPendingOwners, setShowPendingOwners] = useState(false);
  const [highlightOwners, setHighlightOwners] = useState(false);



  const handleShowPending = () => {
    setShowPendingOwners(true);
    setHighlightOwners(true); // trigger highlight
    setTimeout(() => setHighlightOwners(false), 1500); // reset after animation
  };


  const endpoint = useMemo(() => {
    const qs = new URLSearchParams();
    (ownerEmails || []).forEach((e) => e && qs.append("email", e));
    if (organizationType) qs.set("organizationType", organizationType);
    const q = qs.toString();
    return `/api/ciso/dashboard-overview${q ? `?${q}` : ""}`;
  }, [ownerEmails, organizationType]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (mounted) setData(json);
      } catch (e) {
        console.error(e);
        if (mounted) setErr("Failed to load dashboard data.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [endpoint]);

  const counts = data?.counts ?? {
    pending: 0,
    "pending-approval": 0,
    "partially-approved": 0,
    approved: 0,
  };
  const total = data?.totalControlsForOrganizationType ?? 0;
  const goals = data?.goalCountsForOrganizationType || {};
  const pendingOwnerEvidence = data?.pendingOwnerEvidence || [];
  const pendingByEmail = useMemo(() => {
    const m = {};
    for (const { email, controlId, evidenceName } of pendingOwnerEvidence) {
      if (!email) continue;
      (m[email] ||= []).push({ controlId, evidenceName });
    }
    return m;
  }, [pendingOwnerEvidence]);
  const gAnt = goals["ANTICIPATE"] || 0;
  const gWc = goals["WITHSTAND AND CONTAIN"] || 0;
  const gRec = goals["RECOVER"] || 0;
  const gEvo = goals["EVOLVE"] || 0;
  const gSum = Math.max(1, gAnt + gWc + gRec + gEvo);

  const approved = counts.approved || 0;
  const complianceScore = useMemo(() => {
    if (!total) return 0;
    return Math.round((approved / total) * 100);
  }, [approved, total]);

  // For charts
  const segments = useMemo(() => {
    const items = [
      { key: "approved", label: "Approved", color: "#22c55e", value: counts.approved || 0 },
      { key: "partially-approved", label: "Partially Approved", color: "#3b82f6", value: counts["partially-approved"] || 0 },
      { key: "pending-approval", label: "Pending Approval", color: "#f59e0b", value: counts["pending-approval"] || 0 },
      { key: "pending", label: "Pending", color: "#ef4444", value: counts.pending || 0 },
    ];
    const sum = items.reduce((a, b) => a + b.value, 0) || 1;
    let acc = 0;
    return items.map((s) => {
      const start = (acc / sum) * 360;
      const sweep = (s.value / sum) * 360;
      acc += s.value;
      return { ...s, start, sweep };
    });
  }, [counts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-600">
          <svg className="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
          </svg>
          <span>Loading dashboard…</span>
        </div>
      </div>
    );
  }

  if (err) {
    return <p className="text-sm text-red-600">{err}</p>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard
          title="Total Controls"
          value={total}
          onClick={() => setSelectedTab("Control Assignment")}
        />
        <KpiCard
          title="Compliance Score"
          value={`${complianceScore}%`}
        />
        <KpiCard
          title="Pending Approval"
          value={counts["pending-approval"] || 0}
          onClick={() => setSelectedTab("Evidence Approval")}
        />
        <KpiCard
          title="Pending"
          value={counts.pending || 0}
          onClick={handleShowPending}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Status (Control Edivence)">
          <div className="flex items-center gap-6">
            <Donut segments={segments} />
            <div className="space-y-2">
              {segments.map((s) => (
                <div key={s.key} className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} />
                  <span className="text-gray-700">{s.label}</span>
                  <span className="ml-auto font-medium text-gray-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Bars: Status Breakdown */}
        <Card title="Status Breakdown">
          <BarRow label="Approved" value={counts.approved || 0} max={Math.max(1, total)} />
          <BarRow label="Partially Approved" value={counts["partially-approved"] || 0} max={Math.max(1, total)} />
          <BarRow label="Pending Approval" value={counts["pending-approval"] || 0} max={Math.max(1, total)} />
          <BarRow label="Pending" value={counts.pending || 0} max={Math.max(1, total)} />
        </Card>

        <Card title="Goal">
          <GoalRow label={`Anticipate (${gAnt})`} pct={(gAnt / gSum) * 100} />
          <GoalRow label={`Withstand and Contain (${gWc})`} pct={(gWc / gSum) * 100} />
          <GoalRow label={`Recover (${gRec})`} pct={(gRec / gSum) * 100} />
          <GoalRow label={`Evolve (${gEvo})`} pct={(gEvo / gSum) * 100} light />
        </Card>

        {/* Overview -> now shows Owners from props */}
        <Card title="Owners">
          <OwnersList
            emails={ownerEmails}
            pendingByEmail={pendingByEmail}
            showPendingOnly={showPendingOwners}
            highlight={highlightOwners}
          />
        </Card>
      </div>
    </div>
  );
}

/* ========== Small building blocks ========== */

function KpiCard({ title, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border bg-white p-5 shadow-sm w-full text-left hover:shadow-md transition cursor-pointer"
    >
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="mt-1 text-sm text-gray-500">{title}</div>
    </button>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}



function BarRow({ label, value, max }) {
  const pct = Math.min(100, Math.round((value / (max || 1)) * 100));
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-900 font-medium">{value}</span>
      </div>
      <div className="h-3 w-full rounded bg-gray-100 overflow-hidden">
        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GoalRow({ label, pct, light = false }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-sm text-gray-700">{label}</div>
      <div className="h-3 w-full rounded bg-gray-100 overflow-hidden">
        <div
          className={light ? "h-full bg-blue-300" : "h-full bg-blue-500"}
          style={{ width: `${Math.min(100, Math.max(0, Math.round(pct)))}%` }}
        />
      </div>
    </div>
  );
}

function Donut({ segments, size = 140, thickness = 28 }) {
  const stops = [];
  segments.forEach((s) => {
    const from = s.start;
    const to = s.start + s.sweep;
    stops.push(`${s.color} ${from}deg ${to}deg`);
  });
  const bg = `conic-gradient(${stops.join(", ")})`;
  const cut = size - thickness * 2;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size, background: bg, borderRadius: "50%" }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full"
        style={{ width: cut, height: cut }}
      />
    </div>
  );
}

function OwnersList({ emails = [], pendingByEmail = {}, showPendingOnly = false, highlight = false }) {
  const [active, setActive] = useState(null);
  const hoverInTid = useRef(null);
  const hoverOutTid = useRef(null);

  let items = [...new Set((emails || []).filter(Boolean).map((e) => e.trim()))];

  // ✅ filter owners if pending-only mode is active
  if (showPendingOnly) {
    items = items.filter((email) => (pendingByEmail[email]?.length || 0) > 0);
  }

  if (!items.length) {
    return <p className="text-sm text-gray-500">No owners {showPendingOnly ? "with pending items." : "provided."}</p>;
  }

  const details = active ? pendingByEmail[active] || [] : [];

  const handleEnter = (email) => {
    if (hoverInTid.current) clearTimeout(hoverInTid.current);
    hoverInTid.current = setTimeout(() => setActive(email), 80);
  };

  const handleLeaveOwners = () => {
    if (hoverInTid.current) clearTimeout(hoverInTid.current);
    if (hoverOutTid.current) clearTimeout(hoverOutTid.current);
    hoverOutTid.current = setTimeout(() => setActive(null), 150);
  };

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
        highlight ? "animate-pulse-eio" : ""
      }`}
    >
      {/* Owners chips */}
      <div className="flex flex-col gap-3">
        {items.map((email) => {
          const hasPending = (pendingByEmail[email]?.length || 0) > 0;
          const base =
            "inline-flex items-center rounded-full border px-4 py-2 text-xs transition-none " +
            "w-auto shrink-0 whitespace-nowrap select-none";
          const cls = hasPending
            ? "bg-red-50 border-red-300 text-red-700"
            : "bg-gray-50 border-gray-300 text-gray-700";
          return (
            <button
              key={email}
              type="button"
              className={`${base} ${cls}`}
              title={email}
              aria-selected={active === email}
              onMouseEnter={() => handleEnter(email)}
              onFocus={() => setActive(email)}
            >
              {email}
              {hasPending && <span className="ml-2 font-medium">(pending)</span>}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border bg-white p-3 text-sm min-h-[120px] max-h-60 overflow-y-auto overflow-x-hidden">
        {active ? (
          details.length ? (
            <ul className="space-y-1">
              {details.map((d, i) => (
                <li key={`${active}-${d.controlId || "id"}-${i}`}>
                  <span className="font-medium text-gray-900">{d.controlId || "—"}</span>
                  <span className="text-gray-500"> — {d.evidenceName || "Evidence 1"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No pending items for {active}.</p>
          )
        ) : (
          <p className="text-gray-500">
            Hover an owner to see pending Control ID &amp; Evidence.
          </p>
        )}
      </div>
    </div>
  );
}



