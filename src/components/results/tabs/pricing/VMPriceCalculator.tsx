import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PricingModelService } from '@/services/pricing/pricingModelService';
import { formatCurrency, formatPreciseCurrency, formatMonthlyCurrency } from '@/lib/utils';
import { Calculator, Cpu, MemoryStick, HardDrive, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CostBreakdownChart } from './CostBreakdownChart';

interface VMPriceCalculatorProps {
  pricingService: PricingModelService;
}

export const VMPriceCalculator: React.FC<VMPriceCalculatorProps> = ({ pricingService }) => {
  const [vmSpec, setVmSpec] = useState({
    vCPU: 4,
    memoryGB: 16,
    storageGB: 100
  });

  const [calculatedPrice, setCalculatedPrice] = useState<ReturnType<typeof pricingService.calculateVMPrice> | null>(null);

  const handleCalculate = () => {
    const price = pricingService.calculateVMPrice(vmSpec.vCPU, vmSpec.memoryGB, vmSpec.storageGB);
    setCalculatedPrice(price);
  };

  const handleInputChange = (field: keyof typeof vmSpec, value: string) => {
    const numValue = parseInt(value) || 0;
    setVmSpec(prev => ({ ...prev, [field]: numValue }));
  };

  // Calculate natural ratio for reference
  const capacity = pricingService['calculateClusterCapacity']();
  const naturalRatio = capacity.totalMemoryGB > 0 && capacity.totalvCPUs > 0 
    ? capacity.totalvCPUs / capacity.totalMemoryGB 
    : 0.25; // Default to 1:4 ratio if no data
  const naturalRatioDisplay = naturalRatio > 0 ? `1:${(1/naturalRatio).toFixed(1)}` : 'N/A';
  
  const vmRatio = vmSpec.memoryGB > 0 ? vmSpec.vCPU / vmSpec.memoryGB : 0;
  const vmRatioDisplay = vmSpec.memoryGB > 0 && vmSpec.vCPU > 0 
    ? `1:${(vmSpec.memoryGB/vmSpec.vCPU).toFixed(1)}` 
    : 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle>VM Price Calculator</CardTitle>
        <CardDescription>
          Calculate pricing for specific VM configurations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Fields */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="vcpu" className="flex items-center gap-1">
              <Cpu className="h-4 w-4" />
              vCPUs
            </Label>
            <Input
              id="vcpu"
              type="number"
              min="1"
              max="128"
              value={vmSpec.vCPU}
              onChange={(e) => handleInputChange('vCPU', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="memory" className="flex items-center gap-1">
              <MemoryStick className="h-4 w-4" />
              Memory (GB)
            </Label>
            <Input
              id="memory"
              type="number"
              min="1"
              max="512"
              value={vmSpec.memoryGB}
              onChange={(e) => handleInputChange('memoryGB', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storage" className="flex items-center gap-1">
              <HardDrive className="h-4 w-4" />
              Storage (GB)
            </Label>
            <Input
              id="storage"
              type="number"
              min="0"
              max="10000"
              value={vmSpec.storageGB}
              onChange={(e) => handleInputChange('storageGB', e.target.value)}
            />
          </div>
        </div>

        {/* Ratio Information */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Cluster Natural Ratio (vCPU:Memory)</p>
            <p className="text-lg font-medium">{naturalRatioDisplay}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">VM Ratio (vCPU:Memory)</p>
            <p className="text-lg font-medium">{vmRatioDisplay}</p>
            {naturalRatio > 0 && vmRatio > 0 && Math.abs(Math.log2(vmRatio) - Math.log2(naturalRatio)) > 2 && (
              <p className="text-xs text-orange-600 mt-1">
                ⚠️ High deviation from natural ratio
              </p>
            )}
          </div>
        </div>

        {/* Calculate Button */}
        <Button onClick={handleCalculate} className="w-full">
          <Calculator className="h-4 w-4 mr-2" />
          Calculate Price
        </Button>

        {/* Results */}
        {calculatedPrice && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex justify-between items-center font-medium">
                    <span>Monthly Price:</span>
                    <span className="text-2xl text-green-600">
                      {formatMonthlyCurrency(calculatedPrice.monthlyPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Hourly Price:</span>
                    <span>{formatPreciseCurrency(calculatedPrice.baseHourlyPrice)}/hr</span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Cost Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Cost Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Compute Cost:</span>
                  <span>{formatPreciseCurrency(calculatedPrice.breakdown.computeCost)}/hr</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Network Cost:</span>
                  <span>{formatPreciseCurrency(calculatedPrice.breakdown.networkCost)}/hr</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Storage Cost:</span>
                  <span>{formatPreciseCurrency(calculatedPrice.breakdown.storageCost)}/hr</span>
                </div>
                <div className="flex justify-between p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Licensing Cost:</span>
                  <span>{formatPreciseCurrency(calculatedPrice.breakdown.licensingCost)}/hr</span>
                </div>
              </div>
            </div>

            {/* Multipliers */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Applied Multipliers & Penalties</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <div className="text-orange-600 dark:text-orange-400 text-xs">HA Overhead</div>
                  <div className="font-bold text-orange-700 dark:text-orange-300">
                    {calculatedPrice.breakdown.haOverheadMultiplier.toFixed(2)}x
                  </div>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <div className="text-green-600 dark:text-green-400 text-xs">Total Penalty</div>
                  <div className="font-bold text-green-700 dark:text-green-300">
                    +{(calculatedPrice.breakdown.sizePenalty * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <div className="text-blue-600 dark:text-blue-400 text-xs">Ratio Penalty</div>
                  <div className="font-bold text-blue-700 dark:text-blue-300">
                    +{(calculatedPrice.breakdown.ratioPenalty * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                  <div className="text-purple-600 dark:text-purple-400 text-xs">Size Penalty</div>
                  <div className="font-bold text-purple-700 dark:text-purple-300">
                    +{(calculatedPrice.breakdown.vmSizePenalty * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-950/20 rounded-lg border border-gray-200 dark:border-gray-900">
                  <div className="text-gray-600 dark:text-gray-400 text-xs">Ratio Deviation</div>
                  <div className="font-bold text-gray-700 dark:text-gray-300">
                    {calculatedPrice.breakdown.ratioDeviation.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Breakdown Pie Chart */}
            <CostBreakdownChart pricing={calculatedPrice} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};