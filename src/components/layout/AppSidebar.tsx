
import React from 'react';
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Wrench, Folder, FolderOpen, ArrowRight, Settings } from "lucide-react";

const sidebarSections = [
  { label: 'Requirements', path: '/', icon: LayoutDashboard },
  { label: 'Component Library', path: '/components', icon: Folder },
  { label: 'Design', path: '/design', icon: Wrench },
  { label: 'Configure', path: '/configure', icon: Settings },
  { label: 'Results', path: '/results', icon: FolderOpen },
  { label: 'Compare', path: '/compare', icon: ArrowRight },
];

export const AppSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="w-full flex justify-center bg-white/75 dark:bg-card/90 backdrop-blur border-b border-border px-4 py-3 gap-4">
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
              w-28 h-28 rounded-2xl shadow group
              transition-all duration-200
              bg-gradient-to-br from-infra-blue-light/30 to-white dark:from-card/80 dark:to-background/50
              border border-border
              hover:shadow-lg hover:scale-105
              hover:bg-infra-blue-light/80
              hover:text-infra-blue
              cursor-pointer
              ${isActive ? "ring-2 ring-infra-blue" : "text-infra-blue-dark"}
            `}
            style={{ minWidth: "6.5rem", minHeight: "6.5rem" }}
          >
            <section.icon
              className={`mb-2 transition-all duration-200 ${isActive ? "text-infra-blue" : "text-infra-blue-dark"} group-hover:text-infra-blue`}
              size={40}
              strokeWidth={2.2}
            />
            <span className="font-semibold text-sm text-center">
              {section.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
