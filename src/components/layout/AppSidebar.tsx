
import React from 'react';
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Wrench, Folder, FolderOpen, ArrowRight, Settings } from "lucide-react";

const sidebarSections = [
  { label: 'Requirements', path: '/', icon: LayoutDashboard, color: 'bg-[#3e78b2]', hover: 'hover:bg-[#23466d]' },
  { label: 'Component Library', path: '/components', icon: Folder, color: 'bg-[#FFB703]', hover: 'hover:bg-[#c88803]' },
  { label: 'Design', path: '/design', icon: Wrench, color: 'bg-[#219EBC]', hover: 'hover:bg-[#165c6e]' },
  { label: 'Configure', path: '/configure', icon: Settings, color: 'bg-[#8E54E9]', hover: 'hover:bg-[#623d9c]' },
  { label: 'Results', path: '/results', icon: FolderOpen, color: 'bg-[#43AA8B]', hover: 'hover:bg-[#2e755f]' },
  { label: 'Compare', path: '/compare', icon: ArrowRight, color: 'bg-[#FF6392]', hover: 'hover:bg-[#c0436d]' },
];

// Sidebar frame style: fixed vertical, same color as top bar, non-scrollable
export const AppSidebar: React.FC = () => {
  const location = useLocation();
  // Match header background (see Header.tsx: bg-infra-blue)
  const sidebarBg = "bg-infra-blue";

  return (
    <nav
      className={`fixed top-[60px] left-0 h-[calc(100vh-60px)] flex flex-col items-center gap-3 px-2 py-5 min-w-[84px] w-24 ${sidebarBg} shadow-lg z-40`}
      style={{ borderRight: "1px solid #1A3A5F" }}
    >
      {sidebarSections.map(section => {
        const isActive =
          section.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(section.path);

        // Smaller button/card size, minimal rounded corners, solid color, strong hover
        return (
          <Link
            key={section.label}
            to={section.path}
            className={`
              group flex flex-col items-center justify-center
              rounded-md
              shadow
              transition-all duration-200
              ${section.color}
              ${section.hover}
              ${isActive ? "ring-2 ring-white scale-105" : "opacity-90"}
              cursor-pointer
              focus:outline-none
            `}
            style={{
              minWidth: "56px",
              minHeight: "62px",
              padding: "0.4rem 0.4rem",
              marginBottom: "0.35rem",
              borderRadius: "7px"
            }}
          >
            <section.icon className="mb-0.5" size={21} strokeWidth={2.2} />
            <span className="font-semibold text-[0.83rem] tracking-tight text-white text-center leading-tight">
              {section.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
