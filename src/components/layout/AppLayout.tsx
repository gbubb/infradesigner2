
import React, { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ComponentLibrary } from '@/components/sidebar/ComponentLibrary';
import { Header } from '@/components/layout/header';
import { RequirementsPanel } from '@/components/requirements/RequirementsPanel';
import { DesignPanel } from '@/components/design/DesignPanel';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import { Workspace } from '@/components/workspace/Workspace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDesignStore } from '@/store/designStore';
import { PlusCircle } from 'lucide-react';
import { NewDesignDialog } from '@/components/layout/header/dialogs/NewDesignDialog';
import { LoadDesignDialog } from '@/components/layout/header/dialogs/LoadDesignDialog';

export const AppLayout: React.FC = () => {
  const { activeDesign } = useDesignStore();
  const [isNewDesignDialogOpen, setIsNewDesignDialogOpen] = useState(false);
  const [isLoadDesignDialogOpen, setIsLoadDesignDialogOpen] = useState(false);
  
  const handleCreateNewDesign = () => {
    setIsNewDesignDialogOpen(true);
  };

  return (
    <SidebarProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <Header />
        
        <div className="flex flex-1 overflow-hidden">
          <ComponentLibrary />
          
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            <Tabs defaultValue="requirements" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="flex justify-center h-12 bg-white shadow-sm">
                <TabsTrigger value="requirements" className="flex-1">Requirements</TabsTrigger>
                <TabsTrigger value="design" className="flex-1">Design</TabsTrigger>
                <TabsTrigger value="results" className="flex-1">Results</TabsTrigger>
                <TabsTrigger value="workspace" className="flex-1">Workspace</TabsTrigger>
              </TabsList>
              
              <TabsContent value="requirements" className="flex-1 overflow-auto m-0 pt-6 px-6 relative">
                <RequirementsPanel />
              </TabsContent>
              <TabsContent value="design" className="flex-1 overflow-auto m-0 p-0 relative">
                <DesignPanel />
              </TabsContent>
              <TabsContent value="results" className="flex-1 overflow-auto m-0 pt-6 px-6 relative">
                <ResultsPanel />
              </TabsContent>
              <TabsContent value="workspace" className="flex-1 overflow-auto m-0 p-0 relative">
                <Workspace />
              </TabsContent>
            </TabsList>
          </div>
          
          {/* Dialogs for creating/loading designs */}
          <NewDesignDialog 
            isOpen={isNewDesignDialogOpen}
            onOpenChange={setIsNewDesignDialogOpen}
          />
          
          <LoadDesignDialog
            isOpen={isLoadDesignDialogOpen}
            onOpenChange={setIsLoadDesignDialogOpen}
          />
          
          {/* Overlay when no design is active */}
          {!activeDesign && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
                <h2 className="text-2xl font-bold mb-4">Welcome to Infrastructure Designer</h2>
                <p className="text-gray-600 mb-6">
                  To get started, create a new infrastructure design or load an existing one.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button onClick={handleCreateNewDesign} className="flex items-center justify-center gap-2">
                    <PlusCircle className="h-5 w-5" />
                    Create New Design
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
};
