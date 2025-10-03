"use client";
import {
  FaTachometerAlt, FaUsers, FaRegCheckSquare, FaEnvelopeOpenText,
  FaUserShield, FaChalkboardTeacher, FaClipboardList, FaSignOutAlt,
  FaUsersCog
} from "react-icons/fa";


const getMenuForRole = (role) => {
  if (role === "owner") {
    return [
      { label: "Evidence Upload", icon: FaClipboardList }, // 👈 Only for owners
    ];
  }

  return [
    { label: "Dashboard", icon: FaTachometerAlt },
    { label: "Control Assignment", icon: FaClipboardList },
    { label: "Evidence Approval", icon: FaRegCheckSquare },
    { label: "Risk Register", icon: FaUserShield },
    { label: "Training and Awareness", icon: FaChalkboardTeacher },
    { label: "Template", icon: FaEnvelopeOpenText },
    { label: "User Management", icon: FaUsers },
    { label: "Audit Trail", icon: FaClipboardList },
  ];
};



export default function Sidebar({ role, onTabSelect, selectedTab, sidebarOpen }) {
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/";
  };

  const adminMenu = [
    { label: "Manage Users", icon: FaUsersCog },
    { label: "Manage Controls", icon: FaClipboardList },
  ];
  
  const currentMenu = role === "admin" ? adminMenu : getMenuForRole(role);

  

  return (
    <div
      className={`fixed top-16 left-0 h-[calc(100vh-64px)] w-60 bg-white border-r border-[#DFE1E6] flex flex-col justify-between text-[#172B4D] font-medium transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      style={{ fontFamily: '"Segoe UI", "Roboto", "Inter", system-ui, sans-serif' }}
    >

      <div>

        {/* Menu Items */}
        <ul className="mt-2 space-y-[2px]">
          {currentMenu.map(({ label, icon: Icon }, i) => {
            const isSelected = selectedTab === label;
            return (
              <li
                key={i}
                onClick={() => onTabSelect(label)}
                className={`px-4 py-[6px] cursor-pointer transition-all duration-150 ${isSelected ? "border-l-2 border-[#0C66E4]" : "border-l-3 border-transparent"
                  }`}
              >
                <div
                  className={`inline-flex items-center ${isSelected ? "gap-4 bg-[#E9F2FF] text-[#0C66E4] rounded-md px-3 py-1 font-semibold" : "gap-3 hover:bg-[#F4F5F7] text-[#172B4D] px-3 py-1 rounded-md"}`}
                >
                  <Icon
                    className={`text-sm ${isSelected ? "text-[#0C66E4]" : "text-[#5E6C84]"}`}
                  />
                  <span className="text-[14px]">{label}</span>
                </div>
              </li>

            );
          })}
        </ul>
      </div>

      <div className="px-4 py-4">
        <div
          className="px-4 py-[6px] cursor-pointer transition-all duration-150 border-l-4 border-transparent hover:border-l-4"
          onClick={handleLogout}
        >
          <div className="inline-flex items-center gap-3 px-3 py-2 rounded-md bg-transparent hover:bg-[#FFEBE6] text-[#172B4D] hover:text-[#DE350B] text-sm transition-colors duration-150">
            <FaSignOutAlt className="text-sm" />
            <span>Logout</span>
          </div>
        </div>

      </div>
    </div>
  );
}
