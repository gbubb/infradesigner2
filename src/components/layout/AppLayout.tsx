
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ComponentLibrary } from '@/components/sidebar/ComponentLibrary';
import { Header } from '@/components/layout/Header';
import { RequirementsPanel } from '@/components/requirements/RequirementsPanel';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="requirements" className="w-full h-full flex flex-col">
          <TabsList className="mx-6 mt-2 mb-0">
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
            <TabsTrigger value="components">Component Library</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          <TabsContent value="requirements" className="flex-1 overflow-auto m-0 pt-6 px-6">
            <RequirementsPanel />
          </TabsContent>
          <TabsContent value="components" className="flex-1 overflow-auto m-0 pt-6 px-6">
            <ComponentLibrary />
          </TabsContent>
          <TabsContent value="results" className="flex-1 overflow-auto m-0 pt-6 px-6">
            <ResultsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
