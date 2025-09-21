'use client'
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { Bell, Settings, ChevronDown, LogOut, Menu, X, Users, Download } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

import Home from "@/app/components/Home";
import MyFiles from "@/app/components/MyFiles";
import DeletedFiles from "@/app/components/DeletedFiles";
import SharedFiles from "@/app/components/SharedFiles";
import Starred from "@/app/components/Starred";
import AdminUserFiles from "@/app/components/AdminUserFiles";
import AdminDownloadStats from "@/app/components/AdminDownloadStats";
import Downloads from "@/app/components/Downloads";
import AllUsers from "@/app/components/AllUsers";
import Avatar from "@/app/components/Avatar";
import { GRAPHQL_ENDPOINT } from "@/lib/backend";

export default function Dashboard() {
  const [selectedOption, setSelectedOption] = useState("Home");
  const [usage, setUsage] = useState<{ usedBytes: number; quotaBytes: number; percentUsed: number } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { name: "Home", icon: "/home.svg", type: "svg" },
    { name: "My Files", icon: "/files.svg", type: "svg" },
    { name: "Starred", icon: "/starred.svg", type: "svg" },
    { name: "Shared", icon: "/shared.svg", type: "svg" },
    { name: "Downloads", icon: Download, type: "lucide" },
    { name: "Deleted", icon: "/delete.svg", type: "svg" },
    ...(user?.isAdmin ? [
      { name: "All Users", icon: Users, type: "lucide" },
      { name: "User Files", icon: "/files.svg", type: "svg" },
      { name: "Download Stats", icon: "/storage.svg", type: "svg" }
    ] : [])
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Dynamically render selected page
  const renderContent = () => {
    switch (selectedOption) {
      case "Home":
        return <Home />;
      case "My Files":
        return <MyFiles />;
      case "Starred":
        return <Starred />;
      case "Shared":
        return <SharedFiles />;
      case "Downloads":
        return <Downloads />;
      case "Deleted":
        return <DeletedFiles />;
      case "All Users":
        return user?.isAdmin ? <AllUsers /> : <div className="p-8"><p className="text-red-500">Access denied</p></div>;
      case "User Files":
        return user?.isAdmin ? <AdminUserFiles /> : <div className="p-8"><p className="text-red-500">Access denied</p></div>;
      case "Download Stats":
        return user?.isAdmin ? <AdminDownloadStats /> : <div className="p-8"><p className="text-red-500">Access denied</p></div>;
      default:
        return <Home />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-white shadow-md flex flex-col z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Header with close button and logo */}
        <div className="p-6 pb-0 flex-shrink-0">
          {/* Logo */}
          <div className="mb-8 -ml-1 -mt-2">
            <Image src="/logo.png" alt="Logo" width={180} height={180} />
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 flex flex-col px-6 pb-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Nav */}
          <nav className="flex-1">
            <ul className="space-y-6">
            {navItems.map((item) => (
              <li key={item.name}>
                <button
                  onClick={() => {
                    setSelectedOption(item.name);
                    setIsSidebarOpen(false); // Close sidebar on mobile when item is selected
                  }}
                  className={`flex items-center relative w-full text-base font-medium px-3 py-2 transition ${
                    selectedOption === item.name
                      ? "text-blue-600"
                      : "text-gray-600 hover:text-blue-500"
                  }`}
                >
                  {selectedOption === item.name && (
                    <span className="absolute -left-6 top-1/2 -translate-y-1/2">
                      <Image
                        src="/selected.svg"
                        alt="selected icon"
                        width={11}
                        height={11}
                      />
                    </span>
                  )}
                  {item.type === "lucide" ? (
                    <item.icon 
                      className={`w-5 h-5 mr-3 ${
                        selectedOption === item.name ? "text-blue-600" : "text-blue-600"
                      }`}
                      strokeWidth={2.5}
                    />
                  ) : (
                    <Image
                      src={item.icon as string}
                      alt={`${item.name} icon`}
                      width={20}
                      height={20}
                      className="mr-3"
                    />
                  )}
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Storage Card */}
        <div className="mt-8 flex-shrink-0">
          <StorageCard usage={usage} onRefresh={() => fetchUsage(setUsage)} />
        </div>
      </div>
      </aside>

      {/* Backdrop overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="flex items-center min-w-0 flex-1">
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden mr-3 p-2 rounded-md hover:bg-gray-100 flex-shrink-0"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-md sm:text-lg lg:text-2xl font-semibold text-gray-900 truncate">
                {selectedOption}
              </h2>
              <p className="text-sm sm:text-base text-gray-500 truncate">
                Welcome, {user?.name || user?.email || "Guest"}! 👋
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-6 flex-shrink-0">
            {/* User Avatar Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-1 sm:space-x-2 focus:outline-none"
              >
                <Avatar
                  src={user?.picture}
                  alt={`${user?.name || user?.email || 'User'} profile`}
                  size={32}
                  fallbackText={getInitial(user)}
                />
                <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700 hidden xs:block" />
              </button>
              
              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-300 rounded-md shadow-lg z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{user?.name || user?.email}</div>
                      <div className="text-gray-500">
                        {(user?.email)?.slice(0, 20)}
                        {(user?.email && user.email.length > 20) ? "…" : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        logout();
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Page */}
        {renderContent()}
      </main>
    </div>
  );
}

function bytesToMB(n: number) {
  return (n / (1024 * 1024)).toFixed(2);
}

async function fetchUsage(setUsage: (u: { usedBytes: number; quotaBytes: number; percentUsed: number; savingsBytes?: number; savingsPercent?: number } | null) => void) {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || undefined : undefined;
    const query = `query MyStorage { myStorage { usedBytes quotaBytes percentUsed savingsBytes savingsPercent } }`;
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message || "Failed to load usage");
    setUsage(json.data?.myStorage || null);
  } catch (e) {
    // ignore for sidebar
  }
}

function StorageCard({ usage, onRefresh }: { usage: { usedBytes: number; quotaBytes: number; percentUsed: number; savingsBytes?: number; savingsPercent?: number } | null; onRefresh: () => void }) {
  useEffect(() => {
    onRefresh();
    const onUpdate = () => onRefresh();
    window.addEventListener("files:updated", onUpdate);
    return () => window.removeEventListener("files:updated", onUpdate);
  }, [onRefresh]);

  const percent = Math.min(100, Math.max(0, Math.round(usage?.percentUsed ?? 0)));
  const used = usage ? bytesToMB(usage.usedBytes) : "-";
  const quota = usage ? bytesToMB(usage.quotaBytes) : "-";
  const savings = usage ? bytesToMB(usage.savingsBytes || 0) : "-";
  const savingsPercent = usage ? Math.round(usage.savingsPercent || 0) : 0;

  return (
    <div className="bg-gray-100 rounded-2xl p-4 mt-8">
      <div className="flex flex-col items-center">
        <Image src="/storage.svg" alt="storage icon" width={100} height={100} />
        <p className="mt-2 text-gray-700 font-medium">{percent}% In-use</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percent}%` }} />
        </div>
  <p className="text-sm text-gray-500 mt-1">{used} MB / {quota} MB</p>
  <p className="text-xs text-green-700 mt-1">Saved {savings} MB ({savingsPercent}%) via deduplication</p>
      </div>
      <button onClick={onRefresh} className="mt-4 bg-blue-600 text-white font-medium px-4 py-2 rounded-lg w-full hover:bg-blue-700">
        Refresh
      </button>
    </div>
  );
}

function getInitial(user: { name?: string; email?: string } | null) {
  const source = user?.name || user?.email || "?";
  return source.trim().charAt(0).toUpperCase();
}
