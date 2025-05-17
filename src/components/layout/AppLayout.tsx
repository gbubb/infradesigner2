
import React from "react";
import { Header } from "@/components/layout/header";
import { useDesignStore } from "@/store/designStore";
import { ComponentProvider } from "@/context/ComponentContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Outlet } from "react-router-dom";

// The structure is: Header (sticky, full width) -> Sidebar (fixed vertical and does NOT scroll with content, begins under header) -> Scrollable Main Content
export const AppLayout: React.FC = () => {
  const { activeDesign } = useDesignStore();

  // Sidebar height matches viewport minus header height (60px), adjusts on small screens.
  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 w-full">
        <Header />
      </div>
      {/* Main area: sidebar as fixed vertical beneath header, content scrolls beside */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Fixed Sidebar Frame: top offset for header */}
        <div
          className="fixed left-0 top-[60px] h-[calc(100vh-60px)] w-[92px] z-40 flex-shrink-0"
          style={{
            background: "#1A3A5F",
            borderRight: "1px solid #1A3A5F",
          }}
        >
          <AppSidebar />
        </div>
        {/* Scrollable Main Content: padding-left to avoid underlapping sidebar */}
        <ComponentProvider>
          <div className="flex-1 flex flex-col overflow-auto bg-background relative"
            style={{ paddingLeft: 92 }}
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

