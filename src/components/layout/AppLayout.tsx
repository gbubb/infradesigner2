
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ComponentLibrary } from '@/components/sidebar/ComponentLibrary';
import { Header } from '@/components/layout/Header';
import { RequirementsPanel } from '@/components/requirements/RequirementsPanel';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import { DesignPanel } from '@/components/design/DesignPanel';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { CustomTabsList, CustomTabsTrigger } from '@/components/ui/custom-tabs';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="requirements" className="w-full h-full flex flex-col">
          <div className="mx-6 mt-2 mb-1">
            <CustomTabsList className="w-full max-w-3xl mx-auto justify-between">
              <CustomTabsTrigger value="requirements">Requirements</CustomTabsTrigger>
              <CustomTabsTrigger value="components">Component Library</CustomTabsTrigger>
              <CustomTabsTrigger value="design">Design</CustomTabsTrigger>
              <CustomTabsTrigger value="results">Results</CustomTabsTrigger>
            </CustomTabsList>
          </div>
          <TabsContent value="requirements" className="flex-1 overflow-auto m-0 pt-4 px-6">
            <RequirementsPanel />
          </TabsContent>
          <TabsContent value="components" className="flex-1 overflow-auto m-0 pt-4 px-6">
            <ComponentLibrary />
          </TabsContent>
          <TabsContent value="design" className="flex-1 overflow-auto m-0 pt-4 px-6">
            <DesignPanel />
          </TabsContent>
          <TabsContent value="results" className="flex-1 overflow-auto m-0 pt-4 px-6">
            <ResultsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
