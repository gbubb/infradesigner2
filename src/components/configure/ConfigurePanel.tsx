
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RackLayoutsTab from "./RackLayoutsTab";
import ConnectionRulesTab from "./ConnectionRulesTab";

export const ConfigurePanel: React.FC = () => {
  return (
    <div className="w-full px-8 pt-8 pb-8"> {/* Removed max-w-4xl; more top/bottom spacing */}
      <Tabs defaultValue="racks" className="w-full">
        <TabsList className="grid grid-cols-2 mb-6 max-w-2xl mx-auto">
          <TabsTrigger value="racks">Rack Layouts</TabsTrigger>
          <TabsTrigger value="connections">Connection Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="racks" className="mt-4">
          <RackLayoutsTab />
        </TabsContent>
        <TabsContent value="connections" className="mt-4">
          <ConnectionRulesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default ConfigurePanel;
