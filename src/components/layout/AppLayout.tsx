
import React from "react";
import { Header } from "@/components/layout/header";
import { useDesignStore } from "@/store/designStore";
import { ComponentProvider } from "@/context/ComponentContext";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";

export const AppLayout: React.FC = () => {
  const { activeDesign } = useDesignStore();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ComponentProvider>
        <SidebarProvider>
          <div className="flex flex-1 overflow-hidden w-full">
            <AppSidebar />
            <main className="flex-1 flex flex-col overflow-hidden relative">
              {!activeDesign && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-8">
                  <div className="bg-white rounded-lg p-6 max-w-lg text-center opacity-75 pointer-events-none">
                    <h2 className="text-2xl font-bold mb-4 text-gray-500">Welcome to Infrastructure Design Tool</h2>
                    <p className="mb-6 text-gray-400">
                      To get started, please use the New or Load buttons in the header above.
                    </p>
                  </div>
                </div>
              )}
              <Outlet />
            </main>
          </div>
        </SidebarProvider>
      </ComponentProvider>
    </div>
  );
};
