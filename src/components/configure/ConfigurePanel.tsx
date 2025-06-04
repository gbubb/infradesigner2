
import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RackLayoutsTab from "./RackLayoutsTab";
import RowLayoutTab from "./RowLayoutTab";
import ConnectionRulesTab from "./ConnectionRulesTab";
import NetworkConnectionsTab from "./NetworkConnectionsTab";

export const ConfigurePanel: React.FC = () => {
  return (
    <div className="w-full px-8 pt-8 pb-8">
      <Tabs defaultValue="racks" className="w-full">
        <TabsList className="grid grid-cols-4 mb-6 max-w-4xl mx-auto">
          <TabsTrigger value="racks">Rack Layouts</TabsTrigger>
          <TabsTrigger value="rowlayout">Row Layout</TabsTrigger>
          <TabsTrigger value="connections">Connection Rules</TabsTrigger>
          <TabsTrigger value="netconnections">Network Connections</TabsTrigger>
        </TabsList>
        <TabsContent value="racks" className="mt-4">
          <RackLayoutsTab />
        </TabsContent>
        <TabsContent value="rowlayout" className="mt-4">
          <RowLayoutTab />
        </TabsContent>
        <TabsContent value="connections" className="mt-4">
          <ConnectionRulesTab />
        </TabsContent>
        <TabsContent value="netconnections" className="mt-4">
          <NetworkConnectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default ConfigurePanel;
