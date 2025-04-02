
import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { RequirementsPanel } from '@/components/requirements/RequirementsPanel';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import { DesignPanel } from '@/components/design/DesignPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDesignStore } from '@/store/designStore';
import { ComponentLibrary } from '@/components/sidebar/ComponentLibrary';

export const AppLayout: React.FC = () => {
  const { activeDesign } = useDesignStore();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Tabs defaultValue="requirements" className="w-full h-full flex flex-col">
          <TabsList className="mx-6 mt-2 mb-0">
            <TabsTrigger value="requirements">Requirements</TabsTrigger>
            <TabsTrigger value="components">Component Library</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          <TabsContent value="requirements" className="flex-1 overflow-auto m-0 pt-6 px-6 relative">
            <RequirementsPanel />
          </TabsContent>
          <TabsContent value="components" className="flex-1 overflow-auto m-0 pt-6 px-6 relative">
            <ComponentLibrary />
          </TabsContent>
          <TabsContent value="design" className="flex-1 overflow-auto m-0 pt-6 px-6 relative">
            <DesignPanel />
          </TabsContent>
          <TabsContent value="results" className="flex-1 overflow-auto m-0 pt-6 px-6 relative">
            <ResultsPanel />
          </TabsContent>
          
          {/* Overlay when no design is active - only showing the header with New/Load buttons */}
          {!activeDesign && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-8">
              <div className="bg-white rounded-lg p-6 max-w-lg text-center">
                <h2 className="text-2xl font-bold mb-4">Welcome to Infrastructure Design Tool</h2>
                <p className="mb-6 text-gray-600">
                  To get started, please use the New or Load buttons in the header above.
                </p>
              </div>
            </div>
          )}
        </Tabs>
      </main>
    </div>
  );
};
