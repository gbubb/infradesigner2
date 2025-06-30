import React from 'react';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TB_TO_TIB_FACTOR, StoragePoolEfficiencyFactors } from '@/store/slices/requirements/constants';

interface CostPerTiBBreakdownProps {
  clusterName: string;
  poolType: string;
  totalRawCapacityTB: number;
  usableCapacityTB: number;
  usableCapacityTiB: number;
  totalNodeCost: number;
  costPerTiB: number;
  nodeCount: number;
  isHyperConverged?: boolean;
  totalStorageCost?: number;
  totalDiskCost?: number;
  totalServerCost?: number;
  totalDisks?: number;
  storageAttributedServerCost?: number;
  totalCpuCores?: number;
  storageCpuCores?: number;
  cpuCoresPerDisk?: number;
  costBreakdown?: {
    nodes: Array<{
      name: string;
      quantity: number;
      serverCost: number;
      diskCost: number;
      diskCount: number;
      diskDetails: Array<{ name: string; capacityTB: number; quantity: number; cost: number }>;
    }>;
  };
}

export const CostPerTiBBreakdown: React.FC<CostPerTiBBreakdownProps> = ({
  clusterName,
  poolType,
  totalRawCapacityTB,
  usableCapacityTB,
  usableCapacityTiB,
  totalNodeCost,
  costPerTiB,
  nodeCount,
  isHyperConverged = false,
  totalStorageCost,
  totalDiskCost,
  totalServerCost,
  totalDisks,
  storageAttributedServerCost,
  totalCpuCores,
  storageCpuCores,
  cpuCoresPerDisk,
  costBreakdown
}) => {
  // Get pool efficiency factor from constants
  const poolEfficiencyFactor = StoragePoolEfficiencyFactors[poolType] || 1/3;
  const poolEfficiencyPercentage = (poolEfficiencyFactor * 100).toFixed(1);
  const costBasis = isHyperConverged && totalStorageCost ? totalStorageCost : totalNodeCost;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-4 w-4 ml-1 inline-flex align-middle"
          type="button"
        >
          <Calculator className="h-3 w-3" />
          <span className="sr-only">View cost per TiB calculation</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] max-h-[600px] overflow-y-auto" align="start">
        <div className="space-y-3">
          <div className="font-semibold text-sm">Cost per TiB Calculation - {clusterName}</div>
          
          <Card className="p-3 bg-slate-50 space-y-2">
            <div className="text-xs space-y-1">
              <div className="font-medium">1. Raw Storage Capacity</div>
              <div className="pl-3 text-muted-foreground">
                Total Raw Capacity: {totalRawCapacityTB.toFixed(2)} TB
              </div>
              {costBreakdown && costBreakdown.nodes.length > 0 && (() => {
                // Group nodes by their base template name (remove numeric suffixes)
                const nodeGroups = costBreakdown.nodes.reduce((acc, node) => {
                  // Extract base name by removing trailing numbers and hyphens
                  const baseName = node.name.replace(/-\d+$/, '');
                  const key = `${baseName}_${node.serverCost}_${JSON.stringify(node.diskDetails)}`;
                  
                  if (!acc[key]) {
                    acc[key] = {
                      name: baseName,
                      quantity: 0,
                      serverCost: node.serverCost / node.quantity, // Get unit cost
                      diskCost: node.diskCost / node.quantity, // Get unit cost
                      diskCount: node.diskCount,
                      diskDetails: node.diskDetails,
                      totalQuantity: 0
                    };
                  }
                  acc[key].totalQuantity += node.quantity;
                  return acc;
                }, {} as Record<string, {
                  name: string;
                  serverCost: number;
                  diskCost: number;
                  diskCount: number;
                  diskDetails: Array<{ name: string; capacityTB: number; quantity: number; cost: number }>;
                  totalQuantity: number;
                }>);

                // If all nodes are identical, show as a single group
                const groupedNodes = Object.values(nodeGroups);
                const showSingleGroup = groupedNodes.length === 1;

                return (
                  <div className="pl-3 mt-1 space-y-1">
                    <div className="text-[10px] font-medium text-muted-foreground">Node specification{showSingleGroup ? '' : 's'}:</div>
                    {groupedNodes.map((nodeGroup, idx) => (
                      <div key={idx} className="pl-3 text-[10px] text-muted-foreground space-y-0.5">
                        <div className="font-medium">• {nodeGroup.name} × {nodeGroup.totalQuantity}</div>
                        <div className="pl-3 space-y-0.5">
                          <div>Server: ${nodeGroup.serverCost.toLocaleString()} each</div>
                          {nodeGroup.diskDetails.map((disk, diskIdx) => (
                            <div key={diskIdx}>
                              {disk.quantity}× {disk.name} ({disk.capacityTB} TB) @ ${disk.cost.toLocaleString()} each (${(disk.cost * disk.quantity).toLocaleString()} per node)
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="pl-3 text-[10px] font-medium text-muted-foreground mt-1">
                      Total capacity from all nodes: {totalRawCapacityTB.toFixed(2)} TB
                    </div>
                  </div>
                );
              })()}
            </div>

            <Separator className="my-2" />

            <div className="text-xs space-y-1">
              <div className="font-medium">2. Usable Capacity Calculation</div>
              <div className="pl-3 text-muted-foreground">
                Pool Type: {poolType}
              </div>
              <div className="pl-3 text-muted-foreground">
                Pool Efficiency: {poolEfficiencyPercentage}%
              </div>
              <div className="pl-3 text-muted-foreground">
                Usable Capacity (TB): {totalRawCapacityTB.toFixed(2)} × {poolEfficiencyFactor.toFixed(3)} = {usableCapacityTB.toFixed(2)} TB
              </div>
              <div className="pl-3 text-muted-foreground">
                Usable Capacity (TiB): {usableCapacityTB.toFixed(2)} × {TB_TO_TIB_FACTOR} = {usableCapacityTiB.toFixed(2)} TiB
              </div>
            </div>

            <Separator className="my-2" />

            <div className="text-xs space-y-1">
              <div className="font-medium">3. Cost Basis</div>
              <div className="pl-3 text-muted-foreground">
                Node Count: {nodeCount} nodes
              </div>
              {totalServerCost !== undefined && totalDiskCost !== undefined && (
                <>
                  <div className="pl-3 text-muted-foreground">
                    Total Server Cost: ${totalServerCost.toLocaleString()}
                  </div>
                  <div className="pl-3 text-muted-foreground">
                    Total Disk Cost: ${totalDiskCost.toLocaleString()}
                  </div>
                  <div className="pl-3 text-muted-foreground font-medium">
                    Total Infrastructure Cost: ${totalNodeCost.toLocaleString()}
                  </div>
                </>
              )}
              
              {isHyperConverged && totalStorageCost !== undefined && storageAttributedServerCost !== undefined && (
                <>
                  <div className="pl-3 mt-2 pt-2 border-t">
                    <div className="font-medium mb-1 text-muted-foreground">Hyper-converged Storage Attribution:</div>
                    {totalCpuCores !== undefined && totalCpuCores > 0 && storageCpuCores !== undefined && cpuCoresPerDisk !== undefined ? (
                      <>
                        <div className="pl-3 space-y-1">
                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <div className="grid grid-cols-2 gap-1">
                              <div>• Total CPU cores in cluster:</div>
                              <div className="font-medium">{totalCpuCores} cores</div>
                              
                              <div>• Storage CPU per disk:</div>
                              <div className="font-medium">{cpuCoresPerDisk} cores</div>
                              
                              <div>• Total disks:</div>
                              <div className="font-medium">{totalDisks} disks</div>
                              
                              <div>• Storage CPU cores:</div>
                              <div className="font-medium">{storageCpuCores} cores</div>
                              
                              <div>• Storage CPU percentage:</div>
                              <div className="font-medium">{((storageCpuCores / totalCpuCores) * 100).toFixed(1)}%</div>
                            </div>
                          </div>
                          
                          <div className="text-[11px] bg-slate-100 rounded p-2 mt-2 space-y-0.5">
                            <div className="font-medium">Storage Cost Attribution:</div>
                            <div className="text-muted-foreground">
                              Storage CPU ratio: {storageCpuCores} cores ÷ {totalCpuCores} cores = {((storageCpuCores / totalCpuCores) * 100).toFixed(1)}%
                            </div>
                            <div className="text-muted-foreground mt-1">
                              Total server cost: ${totalServerCost?.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground">
                              × {((storageCpuCores / totalCpuCores) * 100).toFixed(1)}% storage CPU ratio
                            </div>
                            <div className="text-muted-foreground border-b pb-0.5">
                              = ${storageAttributedServerCost.toLocaleString()} storage-attributed server cost
                            </div>
                            <div className="text-muted-foreground mt-1">
                              Storage-attributed server cost: ${storageAttributedServerCost.toLocaleString()}
                            </div>
                            <div className="text-muted-foreground">
                              + Disk cost: ${totalDiskCost?.toLocaleString()}
                            </div>
                            <div className="font-medium text-black pt-1 border-t">
                              = Total storage cost: ${totalStorageCost.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="pl-3 text-[11px] text-red-600">
                        Error: Unable to calculate CPU cores. Please check server configuration.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <Separator className="my-2" />

            <div className="text-xs space-y-1">
              <div className="font-medium">4. Cost per TiB</div>
              <div className="pl-3 text-muted-foreground">
                Formula: Cost Basis ÷ Usable Capacity (TiB)
              </div>
              <div className="pl-3 text-muted-foreground">
                Calculation: ${costBasis.toLocaleString()} ÷ {usableCapacityTiB.toFixed(2)} TiB
              </div>
              <div className="pl-3 font-medium text-primary">
                Result: ${costPerTiB.toLocaleString(undefined, { maximumFractionDigits: 2 })} per TiB
              </div>
            </div>
          </Card>

          {isHyperConverged && (
            <div className="text-[10px] text-muted-foreground italic">
              Note: For hyper-converged clusters, only the storage-related portion of the infrastructure cost is included in this calculation.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};