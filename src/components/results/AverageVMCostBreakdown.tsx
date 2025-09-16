import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Helper function to calculate redundant nodes
const calculateRedundantNodes = (
  redundancy: string,
  totalNodes: number,
  totalAZs: number
): number => {
  if (!redundancy || redundancy === 'None') return 0;

  if (redundancy === 'N+1') {
    return Math.ceil(totalNodes / totalAZs);
  } else if (redundancy === 'N+2') {
    return Math.ceil((totalNodes / totalAZs) * 2);
  } else if (redundancy === '1 Node') {
    return 1;
  } else if (redundancy === '2 Nodes') {
    return 2;
  }

  return 0;
};

interface AverageVMCostBreakdownProps {
  totalVCPUs: number;
  totalMemoryTB: number;
  averageVMVCPUs: number;
  averageVMMemoryGB: number;
  monthlyCost: number;
  quantityOfAverageVMs: number;
  monthlyCostPerAverageVM: number;
  storageAmortizedCost?: number;
  usableVCPUs?: number;
  usableMemoryTB?: number;
  redundancyConfig?: string;
  totalComputeNodes?: number;
  totalAvailabilityZones?: number;
}

export const AverageVMCostBreakdown: React.FC<AverageVMCostBreakdownProps> = ({
  totalVCPUs,
  totalMemoryTB,
  averageVMVCPUs,
  averageVMMemoryGB,
  monthlyCost,
  quantityOfAverageVMs,
  monthlyCostPerAverageVM,
  storageAmortizedCost = 0,
  usableVCPUs,
  usableMemoryTB,
  redundancyConfig = 'None',
  totalComputeNodes = 0,
  totalAvailabilityZones = 8
}) => {
  const [open, setOpen] = React.useState(false);

  const totalMemoryGB = totalMemoryTB * 1024;
  const actualUsableVCPUs = usableVCPUs || totalVCPUs;
  const actualUsableMemoryGB = (usableMemoryTB || totalMemoryTB) * 1024;

  const vmsByCPU = Math.floor(actualUsableVCPUs / averageVMVCPUs);
  const vmsByMemory = Math.floor(actualUsableMemoryGB / averageVMMemoryGB);
  const limitingFactor = vmsByCPU < vmsByMemory ? 'CPU' : 'Memory';

  const computeOnlyCost = monthlyCost - storageAmortizedCost;

  // Calculate redundant capacity
  const redundantVCPUs = totalVCPUs - actualUsableVCPUs;
  const redundantMemoryGB = totalMemoryGB - actualUsableMemoryGB;
  const redundantNodes = calculateRedundantNodes(redundancyConfig, totalComputeNodes, totalAvailabilityZones);
  
  const calculationSteps = [
    `Cluster Configuration:`,
    `- Total Compute Nodes: ${totalComputeNodes} nodes`,
    `- Availability Zones: ${totalAvailabilityZones} AZs`,
    `- Redundancy: ${redundancyConfig}`,
    ``,
    `Total Physical Resources:`,
    `- Total vCPUs: ${totalVCPUs.toLocaleString()} vCPUs`,
    `- Total Memory: ${totalMemoryTB.toLocaleString()} TB (${totalMemoryGB.toLocaleString()} GB)`,
    ``,
    `Redundancy Impact:`,
    redundancyConfig !== 'None' ?
      `- Reserved for Redundancy: ${redundantNodes} nodes (${redundantVCPUs.toLocaleString()} vCPUs, ${(redundantMemoryGB/1024).toFixed(2)} TB)` :
      `- No redundancy configured`,
    redundancyConfig === 'N+1' ?
      `  → Can tolerate failure of 1 availability zone` :
      redundancyConfig === 'N+2' ?
        `  → Can tolerate failure of 2 availability zones` :
        redundancyConfig === '1 Node' ?
          `  → Can tolerate failure of 1 node` :
          redundancyConfig === '2 Nodes' ?
            `  → Can tolerate failure of 2 nodes` : '',
    ``,
    `Usable Capacity (After Redundancy):`,
    `- Usable vCPUs: ${actualUsableVCPUs.toLocaleString()} vCPUs`,
    `- Usable Memory: ${(actualUsableMemoryGB/1024).toFixed(2)} TB (${actualUsableMemoryGB.toLocaleString()} GB)`,
    ``,
    `Average VM Size:`,
    `- vCPUs per VM: ${averageVMVCPUs} vCPUs`,
    `- Memory per VM: ${averageVMMemoryGB} GB`,
    ``,
    `Maximum VM Capacity Calculation (Using Usable Capacity):`,
    `- By CPU: ${actualUsableVCPUs.toLocaleString()} vCPUs ÷ ${averageVMVCPUs} vCPUs/VM = ${vmsByCPU.toLocaleString()} VMs`,
    `- By Memory: ${actualUsableMemoryGB.toLocaleString()} GB ÷ ${averageVMMemoryGB} GB/VM = ${vmsByMemory.toLocaleString()} VMs`,
    ``,
    `Limiting Factor: ${limitingFactor}`,
    `Maximum VMs Possible: ${quantityOfAverageVMs.toLocaleString()} VMs`,
    ``,
    `Monthly Cost Calculation:`,
    `- Total Monthly Cost: $${monthlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `- Storage Amortized Cost: $${storageAmortizedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `- Compute-Only Monthly Cost: $${computeOnlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `- Cost per VM: $${computeOnlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} ÷ ${quantityOfAverageVMs.toLocaleString()} VMs`,
    `- Final Cost per VM: $${monthlyCostPerAverageVM.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  ].filter(step => step !== '');

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-5 w-5 rounded-full" 
        onClick={() => setOpen(true)}
        type="button"
      >
        <Calculator className="h-3 w-3" />
        <span className="sr-only">View calculation</span>
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Average VM Cost Calculation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <Card className="p-3 bg-slate-50 max-h-[300px] overflow-y-auto">
              <ol className="list-decimal list-inside space-y-1.5">
                {calculationSteps.map((step, index) => (
                  <li key={index} className="text-xs">
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}; 