
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ComponentLibrary } from '@/components/sidebar/ComponentLibrary';
import { Workspace } from '@/components/workspace/Workspace';
import { Header } from '@/components/layout/Header';
import { RequirementsPanel } from '@/components/requirements/RequirementsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <ComponentLibrary />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="workspace" className="w-full h-full flex flex-col">
            <TabsList className="mx-6 mt-2 mb-0">
              <TabsTrigger value="workspace">Design Workspace</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
            </TabsList>
            <TabsContent value="workspace" className="flex-1 overflow-hidden m-0 p-0">
              <Workspace />
            </TabsContent>
            <TabsContent value="requirements" className="flex-1 overflow-auto m-0 pt-6 px-6">
              <RequirementsPanel />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};
