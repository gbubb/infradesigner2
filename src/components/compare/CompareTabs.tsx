
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InfrastructureDesign } from "@/types/infrastructure";
import { CapacityComparison } from "./CapacityComparison";
import { CostComparison } from "./CostComparison";
import { RequirementsComparison } from "./RequirementsComparison";

interface CompareTabsProps {
  leftDesign: InfrastructureDesign;
  rightDesign: InfrastructureDesign;
}

export function CompareTabs({ leftDesign, rightDesign }: CompareTabsProps) {
  return (
    <Tabs defaultValue="capacity" className="h-full flex flex-col">
      <TabsList className="grid grid-cols-3 w-[400px] mx-auto mb-4">
        <TabsTrigger value="capacity">Capacity</TabsTrigger>
        <TabsTrigger value="cost">Cost</TabsTrigger>
        <TabsTrigger value="requirements">Requirements</TabsTrigger>
      </TabsList>
      
      <TabsContent value="capacity" className="flex-1 h-full overflow-auto">
        <CapacityComparison leftDesign={leftDesign} rightDesign={rightDesign} />
      </TabsContent>
      
      <TabsContent value="cost" className="flex-1 h-full overflow-auto">
        <CostComparison leftDesign={leftDesign} rightDesign={rightDesign} />
      </TabsContent>
      
      <TabsContent value="requirements" className="flex-1 h-full overflow-auto">
        <RequirementsComparison leftDesign={leftDesign} rightDesign={rightDesign} />
      </TabsContent>
    </Tabs>
  );
}
