
import React from 'react';
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Wrench, Folder, FolderOpen, ArrowRight, Settings } from "lucide-react";

const sidebarSections = [
  { label: 'Requirements', path: '/', icon: LayoutDashboard, color: 'bg-infra-blue-light text-white', hover: 'hover:bg-[#23466d]' },
  { label: 'Component Library', path: '/components', icon: Folder, color: 'bg-[#FFB703] text-white', hover: 'hover:bg-[#c88803]' },
  { label: 'Design', path: '/design', icon: Wrench, color: 'bg-[#219EBC] text-white', hover: 'hover:bg-[#165c6e]' },
  { label: 'Configure', path: '/configure', icon: Settings, color: 'bg-[#8E54E9] text-white', hover: 'hover:bg-[#623d9c]' },
  { label: 'Results', path: '/results', icon: FolderOpen, color: 'bg-[#43AA8B] text-white', hover: 'hover:bg-[#2e755f]' },
  { label: 'Compare', path: '/compare', icon: ArrowRight, color: 'bg-[#FF6392] text-white', hover: 'hover:bg-[#c0436d]' },
];

// Smaller, tight card buttons, less rounded, unique solid color, with icon above text
export const AppSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      className="flex flex-col gap-2 py-4 px-2 w-28 min-w-[7rem] bg-transparent"
      style={{ minHeight: "calc(100vh - 60px)" }} // assuming header is ~60px
    >
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
              flex flex-col items-center justify-center
              rounded-md shadow group
              transition-all duration-200
              ${section.color}
              ${section.hover}
              ${isActive ? "ring-2 ring-infra-blue scale-105" : "opacity-85"}
              cursor-pointer
              focus:outline-none
            `}
            style={{
              minWidth: "80px",
              minHeight: "76px",
              marginBottom: "0.75rem",
            }}
          >
            <section.icon
              className="mb-1"
              size={25}
              strokeWidth={2}
            />
            <span className="font-semibold text-xs text-center">
              {section.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
