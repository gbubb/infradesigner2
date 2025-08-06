import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AverageVMCostBreakdownProps {
  totalVCPUs: number;
  totalMemoryTB: number;
  averageVMVCPUs: number;
  averageVMMemoryGB: number;
  monthlyCost: number;
  quantityOfAverageVMs: number;
  monthlyCostPerAverageVM: number;
  storageAmortizedCost?: number;
}

export const AverageVMCostBreakdown: React.FC<AverageVMCostBreakdownProps> = ({
  totalVCPUs,
  totalMemoryTB,
  averageVMVCPUs,
  averageVMMemoryGB,
  monthlyCost,
  quantityOfAverageVMs,
  monthlyCostPerAverageVM,
  storageAmortizedCost = 0
}) => {
  const [open, setOpen] = React.useState(false);

  const totalMemoryGB = totalMemoryTB * 1024;
  const vmsByCPU = Math.floor(totalVCPUs / averageVMVCPUs);
  const vmsByMemory = Math.floor(totalMemoryGB / averageVMMemoryGB);
  const limitingFactor = vmsByCPU < vmsByMemory ? 'CPU' : 'Memory';

  const computeOnlyCost = monthlyCost - storageAmortizedCost;
  
  const calculationSteps = [
    `Total Available Resources:`,
    `- Total vCPUs: ${totalVCPUs.toLocaleString()} vCPUs`,
    `- Total Memory: ${totalMemoryTB.toLocaleString()} TB (${totalMemoryGB.toLocaleString()} GB)`,
    ``,
    `Average VM Size:`,
    `- vCPUs per VM: ${averageVMVCPUs} vCPUs`,
    `- Memory per VM: ${averageVMMemoryGB} GB`,
    ``,
    `Maximum VM Capacity Calculation:`,
    `- By CPU: ${totalVCPUs.toLocaleString()} vCPUs ÷ ${averageVMVCPUs} vCPUs/VM = ${vmsByCPU.toLocaleString()} VMs`,
    `- By Memory: ${totalMemoryGB.toLocaleString()} GB ÷ ${averageVMMemoryGB} GB/VM = ${vmsByMemory.toLocaleString()} VMs`,
    ``,
    `Limiting Factor: ${limitingFactor}`,
    `Maximum VMs Possible: ${quantityOfAverageVMs.toLocaleString()} VMs`,
    ``,
    `Monthly Cost Calculation (Compute-Focused):`,
    `- Total Monthly Cost: $${monthlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `- Storage Amortized Cost: $${storageAmortizedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `- Compute-Only Monthly Cost: $${computeOnlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `- Cost per VM: $${computeOnlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} ÷ ${quantityOfAverageVMs.toLocaleString()} VMs`,
    `- Final Cost per VM: $${monthlyCostPerAverageVM.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  ];

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