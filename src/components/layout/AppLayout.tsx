
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ComponentLibrary } from '@/components/sidebar/ComponentLibrary';
import { Header } from '@/components/layout/header';
import { RequirementsPanel } from '@/components/requirements/RequirementsPanel';
import { ResultsPanel } from '@/components/results/ResultsPanel';
import { DesignPanel } from '@/components/design/DesignPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDesignStore } from '@/store/designStore';
import { PlusCircle, FolderOpen } from 'lucide-react';
import { NewDesignDialog } from '@/components/layout/header/dialogs/NewDesignDialog';
import { LoadDesignDialog } from '@/components/layout/header/dialogs/LoadDesignDialog';

export const AppLayout: React.FC = () => {
  const { activeDesign } = useDesignStore();
  const [isNewDesignDialogOpen, setIsNewDesignDialogOpen] = React.useState(false);
  const [isLoadDesignDialogOpen, setIsLoadDesignDialogOpen] = React.useState(false);
  
  const handleCreateNewDesign = () => {
    setIsNewDesignDialogOpen(true);
  };
  
  const handleLoadExistingDesign = () => {
    setIsLoadDesignDialogOpen(true);
  };
  
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
          
          {/* Overlay when no design is active */}
          {!activeDesign && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-8">
              <div className="bg-white rounded-lg p-6 max-w-lg text-center">
                <h2 className="text-2xl font-bold mb-4">Welcome to Infrastructure Design Tool</h2>
                <p className="mb-6 text-gray-600">
                  To get started, create a new design or load an existing one using the buttons in the header.
                </p>
                <div className="flex gap-4 justify-center">
                  <button 
                    className="px-4 py-2 bg-infra-blue text-white rounded-md hover:bg-infra-blue/90 transition-colors flex items-center"
                    onClick={handleCreateNewDesign}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Design
                  </button>
                  <button 
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center"
                    onClick={handleLoadExistingDesign}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Load Existing Design
                  </button>
                </div>
              </div>
            </div>
          )}
        </Tabs>
      </main>

      {/* Dialogs for creating/loading designs */}
      <NewDesignDialog 
        isOpen={isNewDesignDialogOpen}
        onOpenChange={setIsNewDesignDialogOpen}
      />
      
      <LoadDesignDialog
        isOpen={isLoadDesignDialogOpen}
        onOpenChange={setIsLoadDesignDialogOpen}
      />
    </div>
  );
};
