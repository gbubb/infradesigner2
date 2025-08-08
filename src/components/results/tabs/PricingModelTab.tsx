import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { useDesignStore } from '@/store';
import { PricingModelService, PricingConfig, PricingModelResult } from '@/services/pricing/pricingModelService';
import { formatCurrency } from '@/lib/utils';
import { Info, DollarSign, Cpu, MemoryStick, HardDrive, Download, FileText } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { PricingVisualization3D } from './pricing/PricingVisualization3D';
import { CapacityBreakdown } from './pricing/CapacityBreakdown';
import { PricingSampleTable } from './pricing/PricingSampleTable';
import { VMPriceCalculator } from './pricing/VMPriceCalculator';

export const PricingModelTab: React.FC = () => {
  const design = useDesignStore((state) => state.design);
  
  const [config, setConfig] = useState<PricingConfig>({
    operatingModel: 'costPlus',
    profitMargin: 1.3, // 30% margin default
    fixedCpuPrice: 0.01,
    fixedMemoryPrice: 0.003,
    fixedStoragePrice: 0.00005,
    targetUtilization: 0.8, // 80% target utilization
    virtualizationOverhead: 0.05, // 5% overhead default
    sizePenaltyFactor: 0.5 // Exponential penalty factor for ratio deviation
  });

  const [pricingResult, setPricingResult] = useState<PricingModelResult | null>(null);

  const pricingService = useMemo(() => {
    return new PricingModelService(design, config);
  }, [design, config]);

  useEffect(() => {
    const result = pricingService.calculatePricing();
    setPricingResult(result);
  }, [pricingService]);

  const handleConfigChange = (key: keyof PricingConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const marginPercentage = config.operatingModel === 'costPlus' 
    ? (config.profitMargin - 1) * 100 
    : (pricingResult?.effectiveMargin || 0) * 100;

  const exportPricingReport = () => {
    if (!pricingResult) return;

    const report = {
      timestamp: new Date().toISOString(),
      configuration: config,
      capacity: pricingResult.clusterCapacity,
      pricing: {
        baseCostPerVCPU: pricingResult.baseCostPerVCPU,
        baseCostPerGBMemory: pricingResult.baseCostPerGBMemory,
        cpuMemoryWeightRatio: pricingResult.cpuMemoryWeightRatio,
        effectiveMargin: pricingResult.effectiveMargin,
      },
      samplePrices: pricingResult.samplePrices,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-model-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPricingCSV = () => {
    if (!pricingResult) return;

    const csvHeader = 'vCPU,Memory (GB),Hourly Price ($),Monthly Price ($),Size Penalty (%),Effective Margin (%)';
    const csvRows = pricingResult.samplePrices.map(price => 
      `${price.vCPU},${price.memoryGB},${price.baseHourlyPrice.toFixed(4)},${price.monthlyPrice.toFixed(2)},${(price.breakdown.sizePenalty * 100).toFixed(0)},${(price.breakdown.effectiveMargin * 100).toFixed(1)}`
    );
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vm-pricing-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={exportPricingCSV}
          disabled={!pricingResult}
        >
          <FileText className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportPricingReport}
          disabled={!pricingResult}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Model Configuration</CardTitle>
          <CardDescription>
            Configure the pricing model for virtual workloads based on infrastructure costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operating Model Selection */}
          <div className="space-y-3">
            <Label>Operating Model</Label>
            <RadioGroup 
              value={config.operatingModel} 
              onValueChange={(value) => handleConfigChange('operatingModel', value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="costPlus" id="costPlus" />
                <Label htmlFor="costPlus" className="font-normal cursor-pointer">
                  Cost Plus - Calculate prices based on infrastructure costs plus margin
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixedPrice" id="fixedPrice" />
                <Label htmlFor="fixedPrice" className="font-normal cursor-pointer">
                  Fixed Price - Set fixed prices per resource unit
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Model-specific inputs */}
          {config.operatingModel === 'costPlus' ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="profitMargin">Profit Margin</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Multiplier applied to base costs (e.g., 1.3 = 30% margin)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-4">
                <Slider
                  id="profitMargin"
                  min={1}
                  max={2}
                  step={0.05}
                  value={[config.profitMargin]}
                  onValueChange={([value]) => handleConfigChange('profitMargin', value)}
                  className="flex-1"
                />
                <span className="w-16 text-right font-medium">
                  {((config.profitMargin - 1) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpuPrice" className="flex items-center space-x-1">
                  <Cpu className="h-4 w-4" />
                  <span>vCPU Price ($/hour)</span>
                </Label>
                <Input
                  id="cpuPrice"
                  type="number"
                  step="0.001"
                  value={config.fixedCpuPrice}
                  onChange={(e) => handleConfigChange('fixedCpuPrice', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memPrice" className="flex items-center space-x-1">
                  <MemoryStick className="h-4 w-4" />
                  <span>Memory Price ($/GB/hour)</span>
                </Label>
                <Input
                  id="memPrice"
                  type="number"
                  step="0.001"
                  value={config.fixedMemoryPrice}
                  onChange={(e) => handleConfigChange('fixedMemoryPrice', parseFloat(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storagePrice" className="flex items-center space-x-1">
                  <HardDrive className="h-4 w-4" />
                  <span>Storage Price ($/TB/hour)</span>
                </Label>
                <Input
                  id="storagePrice"
                  type="number"
                  step="0.0001"
                  value={config.fixedStoragePrice}
                  onChange={(e) => handleConfigChange('fixedStoragePrice', parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Common configuration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="targetUtil">Target Utilization</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Target cluster utilization for sellable capacity</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <Slider
                  id="targetUtil"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={[config.targetUtilization]}
                  onValueChange={([value]) => handleConfigChange('targetUtilization', value)}
                  className="flex-1"
                />
                <span className="w-12 text-right">{(config.targetUtilization * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="virtOverhead">Virtualization Overhead</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Overhead from hypervisor and management</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <Slider
                  id="virtOverhead"
                  min={0}
                  max={0.2}
                  step={0.01}
                  value={[config.virtualizationOverhead]}
                  onValueChange={([value]) => handleConfigChange('virtualizationOverhead', value)}
                  className="flex-1"
                />
                <span className="w-12 text-right">{(config.virtualizationOverhead * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="sizePenalty">Ratio Penalty Factor</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Exponential penalty for VMs that deviate from natural CPU:Memory ratio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <Slider
                  id="sizePenalty"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[config.sizePenaltyFactor]}
                  onValueChange={([value]) => handleConfigChange('sizePenaltyFactor', value)}
                  className="flex-1"
                />
                <span className="w-12 text-right">{(config.sizePenaltyFactor * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      {pricingResult && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Base Cost per vCPU</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(pricingResult.baseCostPerVCPU * 730)}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(pricingResult.baseCostPerVCPU)}/hr
                    </p>
                  </div>
                  <Cpu className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Base Cost per GB RAM</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(pricingResult.baseCostPerGBMemory * 730)}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(pricingResult.baseCostPerGBMemory)}/hr
                    </p>
                  </div>
                  <MemoryStick className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">CPU:Memory Weight Ratio</p>
                    <p className="text-2xl font-bold">
                      1:{pricingResult.cpuMemoryWeightRatio.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Natural capacity ratio
                    </p>
                  </div>
                  <Info className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Effective Margin</p>
                    <p className="text-2xl font-bold text-green-600">
                      {marginPercentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {config.operatingModel === 'costPlus' ? 'Applied margin' : 'Calculated margin'}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Capacity Breakdown */}
          <CapacityBreakdown capacity={pricingResult.clusterCapacity} />

          {/* VM Price Calculator */}
          <VMPriceCalculator pricingService={pricingService} />

          {/* Sample Pricing Table */}
          <PricingSampleTable prices={pricingResult.samplePrices} />

          {/* 3D Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>VM Pricing Visualization</CardTitle>
              <CardDescription>
                Interactive 3D visualization showing price variation with vCPU and memory allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingVisualization3D pricingService={pricingService} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};