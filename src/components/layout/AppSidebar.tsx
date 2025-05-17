
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Wrench, Folder, FolderOpen, ArrowRight, Settings } from "lucide-react";

const SIDEBAR_WIDTH = 108; // widened width

const sidebarSections = [
  { label: "Requirements", path: "/", icon: LayoutDashboard, color: "bg-[#3e78b2]" },
  { label: "Component Library", path: "/components", icon: Folder, color: "bg-[#FFB703]" },
  { label: "Design", path: "/design", icon: Wrench, color: "bg-[#219EBC]" },
  { label: "Configure", path: "/configure", icon: Settings, color: "bg-[#8E54E9]" },
  { label: "Results", path: "/results", icon: FolderOpen, color: "bg-[#43AA8B]" },
  { label: "Compare", path: "/compare", icon: ArrowRight, color: "bg-[#FF6392]" }
];

export const AppSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      className={`flex flex-col items-center h-full w-full px-2 py-4`}
      style={{
        background: "#1A3A5F"
      }}
    >
      {/* Center sidebar items with even spacing */}
      <div className="flex flex-1 flex-col justify-center gap-4 w-full">
        {sidebarSections.map((section) => {
          const isActive =
            section.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(section.path);
          return (
            <Link
              key={section.label}
              to={section.path}
              className={`
                group flex flex-row items-center
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
                width: "100%",
                height: "58px",
                borderRadius: "12px",
                boxSizing: "border-box"
              }}
            >
              <div className="flex items-center justify-center h-full px-4">
                <section.icon size={28} strokeWidth={2.2} className="mr-2" />
                <span
                  className={`
                    font-semibold text-md tracking-tight text-white text-left leading-tight
                    pointer-events-none select-none
                  `}
                  style={{
                    transition: "none"
                  }}
                >
                  {section.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

