
import React from 'react';
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Wrench, Folder, FolderOpen, ArrowRight, Settings } from "lucide-react";

const sidebarSections = [
  { label: 'Requirements', path: '/', icon: LayoutDashboard, color: 'bg-[#3e78b2]' },
  { label: 'Component Library', path: '/components', icon: Folder, color: 'bg-[#FFB703]' },
  { label: 'Design', path: '/design', icon: Wrench, color: 'bg-[#219EBC]' },
  { label: 'Configure', path: '/configure', icon: Settings, color: 'bg-[#8E54E9]' },
  { label: 'Results', path: '/results', icon: FolderOpen, color: 'bg-[#43AA8B]' },
  { label: 'Compare', path: '/compare', icon: ArrowRight, color: 'bg-[#FF6392]' },
];

// Uniform button/card size, grid look, minimal rounded corners, solid color, square/rectangular appearance
export const AppSidebar: React.FC = () => {
  const location = useLocation();

  // Sidebar background matches header.
  const sidebarBg = "bg-infra-blue";

  return (
    <nav
      className={`flex flex-col items-center gap-3 px-1.5 py-4 min-w-[88px] w-[92px] h-full ${sidebarBg} shadow-lg`}
      style={{
        // uniform frame with padding to avoid edge crowding
        borderRight: "1px solid #1A3A5F",
        boxSizing: 'border-box'
      }}
    >
      {/* Sidebar button grid, no vertical scroll */}
      <div className="flex flex-col gap-2 w-full">
        {sidebarSections.map(section => {
          const isActive =
            section.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(section.path);

          return (
            <Link
              key={section.label}
              to={section.path}
              className={`
                group flex flex-col items-center justify-center
                ${section.color}
                ${isActive ? "ring-2 ring-white scale-[1.04]" : ""}
                cursor-pointer shadow
                transition duration-150
                opacity-100
                focus:outline-none
                border border-infra-blue
                hover:shadow-md
              `}
              style={{
                width: "74px",
                height: "76px",
                margin: "0 auto",
                borderRadius: "7px", // Sharper corners, not pill/rounded, but a little soft.
                boxSizing: "border-box",
              }}
            >
              <section.icon className="mb-1" size={24} strokeWidth={2.2} />
              <span className="font-semibold text-[0.85rem] tracking-tight text-white text-center leading-tight">
                {section.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
