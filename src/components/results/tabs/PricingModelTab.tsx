import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { useDesignStore } from '@/store';
import { PricingModelService, PricingConfig, PricingModelResult } from '@/services/pricing/pricingModelService';
import { ComputeCluster } from '@/types/placement';
import { formatCurrency, formatPreciseCurrency, formatMonthlyCurrency } from '@/lib/utils';
import { Info, DollarSign, Cpu, MemoryStick, HardDrive, Download, FileText, Server } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PricingVisualization3D } from './pricing/PricingVisualization3D';
import { CapacityBreakdown } from './pricing/CapacityBreakdown';
import { PricingSampleTableEnhanced } from './pricing/PricingSampleTableEnhanced';
import { VMPriceCalculator } from './pricing/VMPriceCalculator';
import { PricingCurveChart } from './pricing/PricingCurveChart';
import { RatioPremiumChart } from './pricing/RatioPremiumChart';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useCostAnalysis } from '@/hooks/design/useCostAnalysis';

export const PricingModelTab: React.FC = () => {
  const activeDesign = useDesignStore((state) => state.activeDesign);
  const componentTemplates = useDesignStore((state) => state.componentTemplates);
  const [selectedClusterId, setSelectedClusterId] = useState<string>('all');
  const [availableClusters, setAvailableClusters] = useState<ComputeCluster[]>([]);
  const [vmPremiumsOpen, setVmPremiumsOpen] = useState(false);
  const [sizePremiumChartOpen, setSizePremiumChartOpen] = useState(false);
  const [ratioPremiumChartOpen, setRatioPremiumChartOpen] = useState(false);
  const { operationalCosts } = useCostAnalysis();
  
  const [config, setConfig] = useState<PricingConfig>({
    operatingModel: 'costPlus',
    profitMargin: 1.3, // 30% margin default
    fixedCpuPrice: 0.01,
    fixedMemoryPrice: 0.003,
    fixedStoragePrice: 0.00005, // per GB per hour
    targetUtilization: 0.8, // 80% target utilization
    virtualizationOverhead: 0.05, // 5% overhead default
    virtualizationOverheadType: 'percentage', // Default to percentage
    virtualizationOverheadMemory: 0.05, // Default memory overhead
    sizePenaltyFactor: 0.5, // Exponential premium factor for ratio deviation
    ratioPenaltyExponent: 2, // Quadratic curve for ratio penalty by default
    vmSizePenaltyFactor: 0.3, // Base premium factor for large VMs
    vmSizeCurveExponent: 2, // Quadratic curve by default
    vmSizeThreshold: 4, // Start applying premium at 4 vCPUs
    vmSizeAcceleration: 0.5 // Moderate acceleration
  });

  const [pricingResult, setPricingResult] = useState<PricingModelResult | null>(null);

  const pricingService = useMemo(() => {
    const clusterId = selectedClusterId === 'all' ? undefined : selectedClusterId;
    return new PricingModelService(activeDesign, config, componentTemplates, clusterId);
  }, [activeDesign, config, componentTemplates, selectedClusterId]);

  useEffect(() => {
    // Get available clusters
    const clusters = pricingService.getAvailableClusters();
    setAvailableClusters(clusters);
    
    // Calculate pricing
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

  // Show cluster details
  const selectedCluster = availableClusters.find(c => c.id === selectedClusterId);

  return (
    <div className="space-y-6">
      {/* Cluster Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Cluster Selection
          </CardTitle>
          <CardDescription>
            Select a compute cluster to calculate pricing for, or analyze all clusters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="cluster-select" className="min-w-[100px]">Cluster:</Label>
            <Select value={selectedClusterId} onValueChange={setSelectedClusterId}>
              <SelectTrigger id="cluster-select" className="flex-1">
                <SelectValue placeholder="Select a cluster" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clusters</SelectItem>
                {availableClusters.map(cluster => (
                  <SelectItem key={cluster.id} value={cluster.id}>
                    {cluster.name} ({cluster.nodeCount} nodes)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Show selected cluster details */}
          {selectedCluster && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Cluster Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Node Type:</span>
                  <p className="font-medium">{selectedCluster.nodeType.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Node Count:</span>
                  <p className="font-medium">{selectedCluster.nodeCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Cores:</span>
                  <p className="font-medium">{selectedCluster.specifications.totalCores}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Memory:</span>
                  <p className="font-medium">{selectedCluster.specifications.totalMemoryGB} GB</p>
                </div>
              </div>
            </div>
          )}
          
          {availableClusters.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No compute clusters found in the design. Please add compute components to the design first.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

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
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Pricing Model Configuration</CardTitle>
          <CardDescription className="text-sm">
            Configure the pricing model for virtual workloads based on infrastructure costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Operating Model and Profit Margin in same row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Operating Model Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Operating Model</Label>
              <RadioGroup 
                value={config.operatingModel} 
                onValueChange={(value) => handleConfigChange('operatingModel', value)}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="costPlus" id="costPlus" />
                  <Label htmlFor="costPlus" className="font-normal cursor-pointer text-sm">
                    Cost Plus
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixedPrice" id="fixedPrice" />
                  <Label htmlFor="fixedPrice" className="font-normal cursor-pointer text-sm">
                    Fixed Price
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Model-specific inputs */}
            {config.operatingModel === 'costPlus' ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-1">
                  <Label htmlFor="profitMargin" className="text-sm font-medium">Profit Margin</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Target profit margin percentage</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center space-x-2">
                  <Input
                    id="profitMargin"
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={((config.profitMargin - 1) * 100).toFixed(0)}
                    onChange={(e) => {
                      const percentage = parseFloat(e.target.value) || 0;
                      const multiplier = 1 + (percentage / 100);
                      handleConfigChange('profitMargin', multiplier);
                    }}
                    className="w-full"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3 w-3" />
                  <Label htmlFor="cpuPrice" className="text-sm min-w-[80px]">vCPU</Label>
                  <Input
                    id="cpuPrice"
                    type="number"
                    step="0.001"
                    value={config.fixedCpuPrice}
                    onChange={(e) => handleConfigChange('fixedCpuPrice', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">$/hr</span>
                </div>
                <div className="flex items-center gap-2">
                  <MemoryStick className="h-3 w-3" />
                  <Label htmlFor="memPrice" className="text-sm min-w-[80px]">Memory</Label>
                  <Input
                    id="memPrice"
                    type="number"
                    step="0.001"
                    value={config.fixedMemoryPrice}
                    onChange={(e) => handleConfigChange('fixedMemoryPrice', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">$/GB/hr</span>
                </div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-3 w-3" />
                  <Label htmlFor="storagePrice" className="text-sm min-w-[80px]">Storage</Label>
                  <Input
                    id="storagePrice"
                    type="number"
                    step="0.00001"
                    value={config.fixedStoragePrice}
                    onChange={(e) => handleConfigChange('fixedStoragePrice', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground">$/GB/hr</span>
                </div>
              </div>
            )}
          </div>

          {/* Virtualization Overhead and Target Utilization in same row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Virtualization Overhead */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Virtualization Overhead</Label>
              <RadioGroup 
                value={config.virtualizationOverheadType} 
                onValueChange={(value) => handleConfigChange('virtualizationOverheadType', value)}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage" className="font-normal cursor-pointer text-sm">
                    Percentage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed" className="font-normal cursor-pointer text-sm">
                    Fixed
                  </Label>
                </div>
              </RadioGroup>

              {config.virtualizationOverheadType === 'percentage' ? (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="virtOverhead"
                      type="number"
                      step="1"
                      min="0"
                      max="20"
                      value={(config.virtualizationOverhead * 100).toFixed(0)}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0;
                        handleConfigChange('virtualizationOverhead', percentage / 100);
                      }}
                      className="w-full"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="fixedCpuOverhead"
                      type="number"
                      step="1"
                      min="0"
                      value={config.virtualizationOverhead}
                      onChange={(e) => handleConfigChange('virtualizationOverhead', parseFloat(e.target.value) || 0)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">vCPUs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="fixedMemOverhead"
                      type="number"
                      step="1"
                      min="0"
                      value={config.virtualizationOverheadMemory || config.virtualizationOverhead}
                      onChange={(e) => handleConfigChange('virtualizationOverheadMemory', parseFloat(e.target.value) || 0)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">GB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Target Utilization */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1">
                <Label htmlFor="targetUtil" className="text-sm font-medium">Target Utilization</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Target cluster utilization for sellable capacity</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  id="targetUtil"
                  type="number"
                  step="5"
                  min="50"
                  max="100"
                  value={(config.targetUtilization * 100).toFixed(0)}
                  onChange={(e) => {
                    const percentage = parseFloat(e.target.value) || 80;
                    handleConfigChange('targetUtilization', percentage / 100);
                  }}
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Premium Configuration */}
          <Collapsible open={vmPremiumsOpen} onOpenChange={setVmPremiumsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-4 hover:bg-muted/50"
              >
                <h4 className="text-sm font-medium">VM Pricing Premiums</h4>
                {vmPremiumsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
            
            {/* Ratio Premium Configuration */}
            <div className="p-4 bg-muted/30 rounded-lg space-y-4">
              <h5 className="text-sm font-medium flex items-center gap-2">
                Ratio Premium Configuration
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Controls pricing penalty when VM ratio deviates from natural infrastructure ratio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h5>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ratioPremium" className="text-xs">Ratio Premium Factor</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      id="ratioPremium"
                      min={0}
                      max={1}
                      step={0.05}
                      value={[config.sizePenaltyFactor]}
                      onValueChange={([value]) => handleConfigChange('sizePenaltyFactor', value)}
                      className="flex-1"
                    />
                    <span className="w-12 text-right text-xs">{(config.sizePenaltyFactor * 100).toFixed(0)}%</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ratioExponent" className="text-xs">Ratio Curve Exponent</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      id="ratioExponent"
                      min={1}
                      max={4}
                      step={0.5}
                      value={[config.ratioPenaltyExponent || 2]}
                      onValueChange={([value]) => handleConfigChange('ratioPenaltyExponent', value)}
                      className="flex-1"
                    />
                    <span className="w-8 text-right text-xs">{(config.ratioPenaltyExponent || 2).toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.ratioPenaltyExponent === 1 ? 'Linear' : 
                     config.ratioPenaltyExponent === 2 ? 'Quadratic' : 
                     config.ratioPenaltyExponent === 3 ? 'Cubic' : 'Quartic'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Size Premium Configuration */}
            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="vmSizePremium">VM Size Premium Base</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Base premium for large VMs due to scheduling challenges</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center space-x-2">
                  <Slider
                    id="vmSizePremium"
                    min={0}
                    max={1}
                    step={0.05}
                    value={[config.vmSizePenaltyFactor || 0.3]}
                    onValueChange={([value]) => handleConfigChange('vmSizePenaltyFactor', value)}
                    className="flex-1"
                  />
                  <span className="w-12 text-right">{((config.vmSizePenaltyFactor || 0.3) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
            
            {/* Advanced Size Premium Tuning */}
            <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-4">
              <h5 className="text-sm font-medium flex items-center gap-2">
                Advanced Size Premium Curve
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Fine-tune how the size premium increases with VM size</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h5>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="curveExponent" className="text-xs">Curve Exponent</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      id="curveExponent"
                      min={1}
                      max={4}
                      step={0.5}
                      value={[config.vmSizeCurveExponent || 2]}
                      onValueChange={([value]) => handleConfigChange('vmSizeCurveExponent', value)}
                      className="flex-1"
                    />
                    <span className="w-8 text-right text-xs">{(config.vmSizeCurveExponent || 2).toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.vmSizeCurveExponent === 1 ? 'Linear' : 
                     config.vmSizeCurveExponent === 2 ? 'Quadratic' : 
                     config.vmSizeCurveExponent === 3 ? 'Cubic' : 'Quartic'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sizeThreshold" className="text-xs">Size Threshold (vCPUs)</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      id="sizeThreshold"
                      min={2}
                      max={16}
                      step={2}
                      value={[config.vmSizeThreshold || 4]}
                      onValueChange={([value]) => handleConfigChange('vmSizeThreshold', value)}
                      className="flex-1"
                    />
                    <span className="w-8 text-right text-xs">{config.vmSizeThreshold || 4}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Premium starts above this size</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="acceleration" className="text-xs">Acceleration Factor</Label>
                  <div className="flex items-center space-x-2">
                    <Slider
                      id="acceleration"
                      min={0}
                      max={1}
                      step={0.1}
                      value={[config.vmSizeAcceleration || 0.5]}
                      onValueChange={([value]) => handleConfigChange('vmSizeAcceleration', value)}
                      className="flex-1"
                    />
                    <span className="w-8 text-right text-xs">{((config.vmSizeAcceleration || 0.5) * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(config.vmSizeAcceleration || 0.5) < 0.3 ? 'Gentle' : 
                     (config.vmSizeAcceleration || 0.5) < 0.7 ? 'Moderate' : 'Aggressive'}
                  </p>
                </div>
              </div>
            </div>
            </CollapsibleContent>
          </Collapsible>

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
                    <p className="text-sm text-muted-foreground">Base Price per vCPU</p>
                    <p className="text-2xl font-bold">
                      {formatMonthlyCurrency(pricingResult.baseCostPerVCPU * 730)}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPreciseCurrency(pricingResult.baseCostPerVCPU)}/hr
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
                    <p className="text-sm text-muted-foreground">Base Price per GB RAM</p>
                    <p className="text-2xl font-bold">
                      {formatMonthlyCurrency(pricingResult.baseCostPerGBMemory * 730)}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPreciseCurrency(pricingResult.baseCostPerGBMemory)}/hr
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

          {/* Cost vs Price Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Cost & Profit Analysis</CardTitle>
              <CardDescription>
                Infrastructure costs vs sellable capacity pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Infrastructure Cost */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Monthly Cost</p>
                  <p className="text-xl font-bold">
                    {formatMonthlyCurrency(operationalCosts.totalMonthly)}
                  </p>
                  <p className="text-xs text-muted-foreground">Infrastructure + operations</p>
                </div>
                
                {/* Sellable Capacity */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sellable Capacity</p>
                  <div className="text-xl font-bold">
                    <div className="text-sm">{pricingResult.clusterCapacity.sellingvCPUs.toFixed(0)} vCPUs</div>
                    <div className="text-sm">{pricingResult.clusterCapacity.sellingMemoryGB.toFixed(0)} GB RAM</div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    At {(config.targetUtilization * 100).toFixed(0)}% utilization
                  </p>
                </div>
                
                {/* Total Revenue Potential */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatMonthlyCurrency(
                      (pricingResult.clusterCapacity.sellingvCPUs * pricingResult.baseCostPerVCPU * 730) +
                      (pricingResult.clusterCapacity.sellingMemoryGB * pricingResult.baseCostPerGBMemory * 730)
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">At target utilization</p>
                </div>
                
                {/* Monthly Profit */}
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Monthly Profit</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatMonthlyCurrency(
                      ((pricingResult.clusterCapacity.sellingvCPUs * pricingResult.baseCostPerVCPU * 730) +
                       (pricingResult.clusterCapacity.sellingMemoryGB * pricingResult.baseCostPerGBMemory * 730)) -
                      operationalCosts.totalMonthly
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {marginPercentage.toFixed(1)}% margin
                  </p>
                </div>
              </div>
              
              {/* Cost Breakdown */}
              <div className="pt-4 border-t">
                <h5 className="text-sm font-medium mb-3">Monthly Cost Breakdown</h5>
                <div className="space-y-2">
                  {operationalCosts.amortizedMonthly > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hardware Amortization</span>
                      <span className="font-medium">{formatMonthlyCurrency(operationalCosts.amortizedMonthly)}</span>
                    </div>
                  )}
                  {operationalCosts.energyMonthly > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Energy Costs</span>
                      <span className="font-medium">{formatMonthlyCurrency(operationalCosts.energyMonthly)}</span>
                    </div>
                  )}
                  {operationalCosts.racksMonthly > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rack Costs</span>
                      <span className="font-medium">{formatMonthlyCurrency(operationalCosts.racksMonthly)}</span>
                    </div>
                  )}
                  {operationalCosts.facilityMonthly > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Facility Costs</span>
                      <span className="font-medium">{formatMonthlyCurrency(operationalCosts.facilityMonthly)}</span>
                    </div>
                  )}
                  {operationalCosts.licensingMonthly > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Licensing</span>
                      <span className="font-medium">{formatMonthlyCurrency(operationalCosts.licensingMonthly)}</span>
                    </div>
                  )}
                  {operationalCosts.networkMonthly > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Network Operations</span>
                      <span className="font-medium">{formatMonthlyCurrency(operationalCosts.networkMonthly)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium pt-2 border-t">
                    <span>Total Monthly Cost</span>
                    <span>{formatMonthlyCurrency(operationalCosts.totalMonthly)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capacity Breakdown */}
          <CapacityBreakdown capacity={pricingResult.clusterCapacity} />

          {/* VM Price Calculator */}
          <VMPriceCalculator pricingService={pricingService} />
          
          {/* Size Premium Curve Visualization */}
          <Collapsible open={sizePremiumChartOpen} onOpenChange={setSizePremiumChartOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 hover:bg-muted/50 mb-2"
              >
                <span className="text-sm font-medium">Size Premium Curve</span>
                {sizePremiumChartOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <PricingCurveChart 
                pricingService={pricingService} 
                config={config}
              />
            </CollapsibleContent>
          </Collapsible>
          
          {/* Ratio Premium Curve Visualization */}
          <Collapsible open={ratioPremiumChartOpen} onOpenChange={setRatioPremiumChartOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 hover:bg-muted/50 mb-2"
              >
                <span className="text-sm font-medium">Ratio Premium Curve</span>
                {ratioPremiumChartOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <RatioPremiumChart 
                pricingService={pricingService} 
                config={config}
              />
            </CollapsibleContent>
          </Collapsible>

          {/* Sample Pricing Table */}
          <PricingSampleTableEnhanced pricingService={pricingService} />

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