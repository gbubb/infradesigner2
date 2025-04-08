
import React from 'react';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from '@/components/ui/card';
import { useDesignStore } from '@/store/designStore';

interface DebugDialogProps {
  onForceFullRecalculation: () => void;
}

export const DebugDialog: React.FC<DebugDialogProps> = ({ onForceFullRecalculation }) => {
  const { componentRoles, calculationBreakdowns } = useDesignStore();
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Info className="h-4 w-4 mr-1" />
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Calculation Debug Info</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Component Roles</h3>
          <Card className="p-3 mb-4 bg-slate-50 overflow-auto max-h-[200px]">
            <pre className="text-xs">
              {JSON.stringify(componentRoles.map(role => ({
                id: role.id,
                role: role.role,
                assignedComponentId: role.assignedComponentId,
                requiredCount: role.requiredCount,
                adjustedRequiredCount: role.adjustedRequiredCount,
                hasCluster: !!role.clusterInfo
              })), null, 2)}
            </pre>
          </Card>
          
          <h3 className="text-lg font-medium mb-2">Calculation Breakdowns</h3>
          <Card className="p-3 mb-4 bg-slate-50 overflow-auto max-h-[200px]">
            <pre className="text-xs">
              {JSON.stringify(calculationBreakdowns, null, 2)}
            </pre>
          </Card>
          
          <div className="flex justify-center mt-4">
            <Button onClick={onForceFullRecalculation} className="w-full">
              Force Full Recalculation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
