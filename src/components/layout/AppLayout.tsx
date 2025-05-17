
import React from "react";
import { Header } from "@/components/layout/header";
import { useDesignStore } from "@/store/designStore";
import { ComponentProvider } from "@/context/ComponentContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Outlet } from "react-router-dom";

// The structure is: Header (sticky, full width) -> Sidebar (fixed vertical, beneath header, does NOT scroll with content) -> Scrollable Main Content
export const AppLayout: React.FC = () => {
  const { activeDesign } = useDesignStore();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 w-full">
        <Header />
      </div>
      {/* Main area: sidebar as fixed vertical, content scrolls beside */}
      <div className="flex flex-1 min-h-0">
        {/* Fixed Sidebar Frame */}
        <div className="relative z-40">
          <AppSidebar />
        </div>
        {/* Scrollable Content */}
        <ComponentProvider>
          <div className="flex-1 flex flex-col overflow-auto bg-background relative">
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
