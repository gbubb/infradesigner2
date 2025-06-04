
import React from "react";
import { useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Wrench, Folder, FolderOpen, ArrowRight, Settings, TrendingUp, ShoppingCart } from "lucide-react";

const SIDEBAR_WIDTH = 140;

const sidebarSections = [
  { label: "Requirements", path: "/", icon: LayoutDashboard, color: "bg-[#3e78b2]" },
  { label: "Components", path: "/components", icon: Folder, color: "bg-[#FFB703]" },
  { label: "Design", path: "/design", icon: Wrench, color: "bg-[#219EBC]" },
  { label: "Configure", path: "/configure", icon: Settings, color: "bg-[#8E54E9]" },
  { label: "Results", path: "/results", icon: FolderOpen, color: "bg-[#43AA8B]" },
  { label: "Procure", path: "/procure", icon: ShoppingCart, color: "bg-[#FF8C42]" },
  { label: "Compare", path: "/compare", icon: ArrowRight, color: "bg-[#FF6392]" },
  { label: "Model", path: "/model", icon: TrendingUp, color: "bg-[#9C27B0]" }
];

export const AppSidebar: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      className={`flex flex-col items-center h-full w-full px-2 pt-4 pb-4`}
      style={{
        background: "#1A3A5F",
        minWidth: SIDEBAR_WIDTH,
        width: SIDEBAR_WIDTH
      }}
    >
      <div className="flex flex-1 flex-col gap-2 w-full items-center">
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
                group flex flex-col items-center
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
                width: "94%",
                minWidth: "98px",
                height: "68px", // reduced height from 84px to 68px
                borderRadius: "14px",
                boxSizing: "border-box"
              }}
            >
              <div className="flex flex-col items-center justify-center pt-2 flex-1 w-full">
                <section.icon size={26} strokeWidth={2.2} className="mb-1 flex-shrink-0 text-white" />
                <span
                  className={`
                    font-semibold text-[14px] tracking-tight text-white text-center leading-tight
                    pointer-events-none select-none
                    whitespace-nowrap
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
