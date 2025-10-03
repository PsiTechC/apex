"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/utils/Sidebar";
import Topbar from "@/components/utils/Topbar";


import ManageUsers from "@/components/admin/ManageUsers";
import ManageControls from "@/components/admin/ManageControls";

import Dashboard from "@/components/common/Dashboard";

import ControlAssignment from "@/components/ciso/ControlAssignment";
import EvidenceApproval from "@/components/ciso/EvidenceApproval";
import RiskRegister from "@/components/ciso/RiskRegister";
import TrainingAndAwareness from "@/components/ciso/TrainingAndAwareness";
import Template from "@/components/ciso/Template";
import UserManagement from "@/components/ciso/UserManagement";
import AuditTrail from "@/components/ciso/AuditTrail";


import EvidenceUpload from "@/components/owner/EvidenceUpload";

export default function DashboardPage() {
  const [role, setRole] = useState(null);
  const [selectedTab, setSelectedTab] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [ownerEmails, setOwnerEmails] = useState([]);
  const [ownerControlMap, setOwnerControlMap] = useState({});
  const [assignedMap, setAssignedMap] = useState({});
  const [organizationType, setOrganizationType] = useState(null);

  const fetchOwnerControls = async () => {
    try {
      if (role !== "ciso" || !email) return;

      const res = await fetch(`/api/ciso/get-owners?email=${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("Failed to fetch mapped users");

      const data = await res.json();
      const emails = data.members || [];
      setOwnerEmails(emails);

      const map = {};
      const flatMap = {};

      await Promise.all(
        emails.map(async (mEmail) => {
          const controlRes = await fetch(`/api/ciso/get-owner-controls?email=${encodeURIComponent(mEmail)}`);
          if (!controlRes.ok) throw new Error(`Failed to fetch controls for ${mEmail}`);
          const controlData = await controlRes.json();

          map[mEmail] = controlData.controls || [];
          (controlData.controls || []).forEach((c) => {
            if (!flatMap[c.controlId]) flatMap[c.controlId] = [];
            flatMap[c.controlId].push({ owner: mEmail, evidences: c.evidences || [] });
          });
        })
      );

      setOwnerControlMap(map);
      setAssignedMap(flatMap);
    } catch (err) {
      console.error("❌ Error fetching owner controls:", err);
    }
  };



  useEffect(() => {
    if (
      role === "ciso" &&
      email &&
      (
        selectedTab === "Control Assignment" ||
        selectedTab === "Evidence Approval" ||
        selectedTab === "Risk Register" ||
        selectedTab === "Dashboard"
      )
    ) {
      fetchOwnerControls();
    }
  }, [selectedTab, email, role]);

console.log();


  useEffect(() => {
    fetch("/api/verify-token")
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(data => {
        setRole(data.role);
        setEmail(data.email);
        setOrganizationType(data.organizationType || null);
        if (data.role === "admin") {
          setSelectedTab("Manage Users");
        } else if (data.role === "owner") {
          setSelectedTab("Evidence Upload");
        } else {
          setSelectedTab("Dashboard");
        }
      })

      .catch(() => {
        router.push("/");
      });
  }, []);

  const renderContent = () => {
    if (role === "admin") {
      if (selectedTab === "Manage Users") {
        return <ManageUsers />;
      }
      if (selectedTab === "Manage Controls") {
        return <ManageControls sidebarOpen={sidebarOpen} />;
      }
    }

    switch (selectedTab) {
      case "Dashboard":
        return <Dashboard ownerEmails={ownerEmails} organizationType={organizationType}  setSelectedTab={setSelectedTab}/>;
      case "Control Assignment":
        return <ControlAssignment sidebarOpen={sidebarOpen} ciso_email={email} organizationType={organizationType} ownerEmails={ownerEmails} ownerControlMap={ownerControlMap} assignedMap={assignedMap} onRefresh={fetchOwnerControls} />;
      case "Evidence Approval":
        return <EvidenceApproval sidebarOpen={sidebarOpen} ownerEmails={ownerEmails} />;
      case "Risk Register":
        return <RiskRegister sidebarOpen={sidebarOpen} ownerEmails={ownerEmails} ciso_email={email} organizationType={organizationType}/>;
      case "Training and Awareness":
        return <TrainingAndAwareness ciso_email={email} />;
      case "Template":
        return <Template />;
      case "User Management":
        return <UserManagement ownerEmails={ownerEmails}  onRefresh={fetchOwnerControls} />;
      case "Audit Trail":
        return <AuditTrail />;
      case "Evidence Upload":
        return <EvidenceUpload owner_email={email} sidebarOpen={sidebarOpen} />;
      default:
        return;
    }
  };

  if (role === null) return null;

  return (
    <div className="flex min-h-screen bg-[#fff] text-[#333]">
      <Sidebar
        role={role}
        onTabSelect={setSelectedTab}
        selectedTab={selectedTab}
        sidebarOpen={sidebarOpen}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarOpen ? "ml-60" : "ml-0"}`}>

        <Topbar
          title={selectedTab}
          toggleSidebar={() => setSidebarOpen(prev => !prev)}
          sidebarOpen={sidebarOpen}
          email={email}
          role={role}
        />

        <div className="p-6 pt-16 overflow-y-auto h-[calc(100vh-64px)] w-full overflow-x-hidden">

          {renderContent()}
        </div>

      </div>
    </div>

  );

}
