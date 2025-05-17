import React from "react";
import { Header } from "@/components/layout/header";
import { useDesignStore } from "@/store/designStore";
import { ComponentProvider } from "@/context/ComponentContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Outlet } from "react-router-dom";

// Sidebar width and header height should match sidebar styling
const SIDEBAR_WIDTH = 92;
const HEADER_HEIGHT = 60;

export const AppLayout: React.FC = () => {
  const { activeDesign } = useDesignStore();

  // Increase sidebar top offset for clear button spacing under header.
  const HEADER_GAP = 16; // px (adjusted up from 8px)
  const SIDEBAR_TOP = HEADER_HEIGHT + HEADER_GAP;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 w-full">
        <Header />
      </div>
      {/* Main area layout: sidebar fixed under header, main scrollable content */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Sidebar: fixed, below header. Add proper top padding. */}
        <div
          className="fixed left-0"
          style={{
            top: SIDEBAR_TOP,
            height: `calc(100vh - ${SIDEBAR_TOP}px)`,
            width: SIDEBAR_WIDTH,
            zIndex: 40,
            background: "#1A3A5F",
            borderRight: "1px solid #1A3A5F",
            paddingTop: 0
          }}
        >
          <AppSidebar />
        </div>
        {/* Main Content: padding-left for sidebar */}
        <ComponentProvider>
          <div
            className="flex-1 flex flex-col overflow-auto bg-background relative"
            style={{ paddingLeft: SIDEBAR_WIDTH }}
          >
            {!activeDesign && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-8">
                <div className="bg-white rounded-lg p-6 max-w-lg text-center opacity-75 pointer-events-none">
                  <h2 className="text-2xl font-bold mb-4 text-gray-500">
                    Welcome to Infrastructure Design Tool
                  </h2>
                  <p className="mb-6 text-gray-400">
                    To get started, please use the New or Load buttons in the header above.
                  </p>
                </div>
              </div>
            )}
            <Outlet />
          </div>
        </ComponentProvider>
      </div>
    </div>
  );
};
