import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClusterVMCostBreakdownProps {
  clusterName: string;
  clusterId: string;
  totalNodes: number;
  totalPhysicalCores: number;
  totalVCPUs: number;
  totalMemoryGB: number;
  usablePhysicalCores: number;
  usableVCPUs: number;
  usableMemoryGB: number;
  redundantVCPUs: number;
  redundantMemoryGB: number;
  redundantNodes: number;
  maxAverageVMs: number;
  monthlyCostPerVM: number;
  averageVMVCPUs: number;
  averageVMMemoryGB: number;
  redundancyConfig: string;
  availabilityZoneCount: number;
  overcommitRatio: number;
  isHyperConverged: boolean;
  storageOverheadCores?: number;
  storageOverheadMemoryGB?: number;
  totalDisksInCluster?: number;
  cpuCoresPerDisk?: number;
  memoryGBPerDisk?: number;
  // Cost breakdown details
  totalComputeNodes: number;
  clusterCostShare: number;
  operationalCostShare: number;
  totalOperationalCost: number;
  computeAmortizedCost: number;
  storageAmortizedCost: number;
  // Granular cost breakdown
  networkAmortizedCost?: number;
  licensingCost?: number;
  racksCost?: number;
  facilityCost?: number;
  energyCost?: number;
}

export const ClusterVMCostBreakdown: React.FC<ClusterVMCostBreakdownProps> = ({
  clusterName,
  totalNodes,
  totalPhysicalCores,
  totalVCPUs,
  totalMemoryGB,
  usablePhysicalCores,
  usableVCPUs,
  usableMemoryGB,
  redundantVCPUs,
  redundantMemoryGB,
  redundantNodes,
  maxAverageVMs,
  monthlyCostPerVM,
  averageVMVCPUs,
  averageVMMemoryGB,
  redundancyConfig,
  availabilityZoneCount,
  overcommitRatio,
  isHyperConverged,
  storageOverheadCores,
  storageOverheadMemoryGB,
  totalDisksInCluster,
  cpuCoresPerDisk,
  memoryGBPerDisk,
  totalComputeNodes,
  clusterCostShare,
  operationalCostShare,
  totalOperationalCost,
  computeAmortizedCost,
  storageAmortizedCost,
  networkAmortizedCost = 0,
  licensingCost = 0,
  racksCost = 0,
  facilityCost = 0,
  energyCost = 0
}) => {
  const [open, setOpen] = React.useState(false);

  const vmsByCPU = Math.floor(usableVCPUs / averageVMVCPUs);
  const vmsByMemory = Math.floor(usableMemoryGB / averageVMMemoryGB);
  const limitingFactor = vmsByCPU < vmsByMemory ? 'CPU' : 'Memory';

  const nodeSharePercentage = totalComputeNodes > 0 ? (totalNodes / totalComputeNodes) * 100 : 0;
  const computeOnlyCost = totalOperationalCost - storageAmortizedCost;
  const totalClusterMonthlyCost = clusterCostShare + operationalCostShare;

  const computeAvailableCores = totalPhysicalCores - (storageOverheadCores || 0);
  const computeAvailableMemoryGB = totalMemoryGB - (storageOverheadMemoryGB || 0);
  const redundantPhysicalCores = totalPhysicalCores - usablePhysicalCores - (storageOverheadCores || 0);

  const calculationSteps = [
    `Cluster: ${clusterName}`,
    ``,
    `=== CLUSTER CONFIGURATION ===`,
    `Total Nodes in Cluster: ${totalNodes} nodes`,
    `Availability Zones: ${availabilityZoneCount} AZs`,
    `Redundancy: ${redundancyConfig}`,
    `Cluster Type: ${isHyperConverged ? 'Hyper-Converged' : 'Compute-Only'}`,
    `CPU Overcommit Ratio: ${overcommitRatio}:1`,
    ``,
    `=== PHYSICAL RESOURCES ===`,
    `Total Physical CPU Cores: ${totalPhysicalCores.toLocaleString()} cores`,
    `Total Memory: ${(totalMemoryGB / 1024).toFixed(2)} TB (${totalMemoryGB.toLocaleString()} GB)`,
    ``,
    ...(isHyperConverged && storageOverheadCores !== undefined ? [
      `=== STORAGE OVERHEAD (HYPER-CONVERGED) ===`,
      `Total Disks in Cluster: ${totalDisksInCluster} disks`,
      `Configured Resources per Disk:`,
      `  - CPU Cores: ${cpuCoresPerDisk ?? 4} cores/disk`,
      `  - Memory: ${memoryGBPerDisk ?? 2} GB/disk`,
      ``,
      `Storage Reserved CPU Cores: ${storageOverheadCores} cores (${totalDisksInCluster} disks × ${cpuCoresPerDisk ?? 4} cores/disk)`,
      `Storage Reserved Memory: ${(storageOverheadMemoryGB! / 1024).toFixed(2)} TB (${storageOverheadMemoryGB} GB)`,
      `→ Storage operations require dedicated CPU/memory per disk`,
      ``,
      `Compute-Available Physical Cores: ${computeAvailableCores.toLocaleString()} cores`,
      `  (${totalPhysicalCores.toLocaleString()} total - ${storageOverheadCores} storage overhead)`,
      `Compute-Available Memory: ${(computeAvailableMemoryGB / 1024).toFixed(2)} TB`,
      `  (${(totalMemoryGB / 1024).toFixed(2)} TB total - ${(storageOverheadMemoryGB! / 1024).toFixed(2)} TB storage overhead)`,
      ``
    ] : []),
    `=== REDUNDANCY IMPACT ===`,
    redundancyConfig !== 'None' ?
      `Reserved Capacity: ${redundantNodes} nodes (${redundantPhysicalCores.toLocaleString()} cores, ${(redundantMemoryGB / 1024).toFixed(2)} TB)` :
      `No redundancy configured`,
    redundancyConfig === 'N+1' ?
      `→ Can tolerate failure of 1 availability zone` :
      redundancyConfig === 'N+2' ?
        `→ Can tolerate failure of 2 availability zones` :
        redundancyConfig === '1 Node' ?
          `→ Can tolerate failure of 1 node` :
          redundancyConfig === '2 Nodes' ?
            `→ Can tolerate failure of 2 nodes` : '',
    ``,
    `=== USABLE CAPACITY (AFTER REDUNDANCY) ===`,
    `Usable Physical Cores: ${usablePhysicalCores.toLocaleString()} cores`,
    `Usable Memory: ${(usableMemoryGB / 1024).toFixed(2)} TB (${usableMemoryGB.toLocaleString()} GB)`,
    ``,
    `=== OVERCOMMIT APPLICATION ===`,
    `Overcommit Ratio: ${overcommitRatio}:1`,
    `Virtual CPUs (vCPUs): ${usablePhysicalCores.toLocaleString()} cores × ${overcommitRatio} = ${usableVCPUs.toLocaleString()} vCPUs`,
    `→ ${overcommitRatio}x overcommit means each physical core supports ${overcommitRatio} vCPUs`,
    ``,
    `=== VM CAPACITY CALCULATION ===`,
    `Average VM Size: ${averageVMVCPUs} vCPUs, ${averageVMMemoryGB} GB RAM`,
    ``,
    `By CPU: ${usableVCPUs.toLocaleString()} vCPUs ÷ ${averageVMVCPUs} vCPUs/VM = ${vmsByCPU.toLocaleString()} VMs`,
    `By Memory: ${usableMemoryGB.toLocaleString()} GB ÷ ${averageVMMemoryGB} GB/VM = ${vmsByMemory.toLocaleString()} VMs`,
    ``,
    `Limiting Factor: ${limitingFactor}`,
    `Maximum VMs in Cluster: ${maxAverageVMs.toLocaleString()} VMs`,
    ``,
    `=== COST ALLOCATION ===`,
    `Total Compute Nodes (All Clusters): ${totalComputeNodes} nodes`,
    `Cluster's Share: ${totalNodes} ÷ ${totalComputeNodes} = ${nodeSharePercentage.toFixed(1)}%`,
    ``,
    `Total Operational Cost: $${totalOperationalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `  - Compute Amortization: $${computeAmortizedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `  - Storage Amortization: $${storageAmortizedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} (excluded)`,
    `  - Network Hardware Amortization: $${networkAmortizedCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ...(licensingCost > 0 ? [`  - Licensing & Support: $${licensingCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`] : []),
    ...(racksCost > 0 ? [`  - Rack Colocation: $${racksCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`] : []),
    ...(facilityCost > 0 ? [`  - Datacenter Facility: $${facilityCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`] : []),
    ...(energyCost > 0 ? [`  - Energy Consumption: $${energyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`] : []),
    ``,
    `Compute-Only Operational Cost: $${computeOnlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `  (Total - Storage Amortization)`,
    ``,
    `Cluster's Cost Allocation:`,
    `  - Compute Share: $${clusterCostShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `  - Operational Share: $${operationalCostShare.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `  - Total Cluster Monthly: $${totalClusterMonthlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ``,
    `=== MONTHLY COST PER VM ===`,
    maxAverageVMs > 0 ?
      `$${totalClusterMonthlyCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} ÷ ${maxAverageVMs.toLocaleString()} VMs` :
      `Cannot calculate (no VMs possible)`,
    !isNaN(monthlyCostPerVM) ?
      `= $${monthlyCostPerVM.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per VM/month` :
      `= Unable to calculate`
  ].filter(step => step !== null && step !== '');

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
        <span className="sr-only">View calculation breakdown</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Cluster VM Cost Calculation - {clusterName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            <Card className="p-4 bg-slate-50">
              <div className="space-y-1.5 font-mono text-xs">
                {calculationSteps.map((step, index) => {
                  // Check if this is a section header
                  const isSectionHeader = step.startsWith('===');
                  const isEmpty = step === '';

                  if (isSectionHeader) {
                    return (
                      <div key={index} className="font-bold text-sm text-blue-700 mt-3 first:mt-0">
                        {step.replace(/===/g, '').trim()}
                      </div>
                    );
                  }

                  if (isEmpty) {
                    return <div key={index} className="h-1" />;
                  }

                  // Check if this is an indented item (starts with spaces or →)
                  const isIndented = step.startsWith('  ') || step.startsWith('→');

                  return (
                    <div
                      key={index}
                      className={`${isIndented ? 'ml-4 text-slate-600' : 'text-slate-900'}`}
                    >
                      {step}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Note:</p>
              <p>
                Storage costs are excluded from VM pricing as they are typically billed separately
                based on capacity usage. This calculation focuses on compute infrastructure costs
                (servers, networking, facility, and energy) divided across the available VM capacity.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};