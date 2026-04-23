import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { useDesignStore } from '@/store';
import { PricingModelService, PricingConfig, PricingModelResult, StoragePoolConfig } from '@/services/pricing/pricingModelService';
import { ComputeCluster } from '@/types/placement';
import { formatPreciseCurrency, formatMonthlyCurrency } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';
import { Info, DollarSign, Cpu, MemoryStick, HardDrive, Download, FileText, Server, TrendingUp } from 'lucide-react';
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
import { useComputeClusterMetrics } from '@/hooks/design/useComputeClusterMetrics';

export const PricingModelTab: React.FC = () => {
  const activeDesign = useDesignStore((state) => state.activeDesign);
  const componentTemplates = useDesignStore((state) => state.componentTemplates);
  const updatePricingConfig = useDesignStore((state) => state.updatePricingConfig);
  const [selectedClusterId, setSelectedClusterId] = useState<string>('all');
  const [availableClusters, setAvailableClusters] = useState<ComputeCluster[]>([]);
  const [vmPremiumsOpen, setVmPremiumsOpen] = useState(false);
  const [sizePremiumChartOpen, setSizePremiumChartOpen] = useState(false);
  const [ratioPremiumChartOpen, setRatioPremiumChartOpen] = useState(false);
  const { operationalCosts: rawOperationalCosts } = useCostAnalysis();
  const currency = useCurrency();
  const clusterMetrics = useComputeClusterMetrics();

  // Stabilize operationalCosts reference to prevent unnecessary re-renders
  const operationalCosts = useMemo(() => ({
    totalMonthly: rawOperationalCosts.totalMonthly,
    amortizedMonthly: rawOperationalCosts.amortizedMonthly,
    energyMonthly: rawOperationalCosts.energyMonthly,
    racksMonthly: rawOperationalCosts.racksMonthly,
    facilityMonthly: rawOperationalCosts.facilityMonthly,
    licensingMonthly: rawOperationalCosts.licensingMonthly,
    networkMonthly: rawOperationalCosts.networkMonthly
  }), [
    rawOperationalCosts.totalMonthly,
    rawOperationalCosts.amortizedMonthly,
    rawOperationalCosts.energyMonthly,
    rawOperationalCosts.racksMonthly,
    rawOperationalCosts.facilityMonthly,
    rawOperationalCosts.licensingMonthly,
    rawOperationalCosts.networkMonthly
  ]);

  // Default pricing config - memoized to prevent recreating on every render
  const defaultConfig: PricingConfig = useMemo(() => ({
    operatingModel: 'costPlus',
    profitMargin: 1.3, // 30% margin default
    fixedCpuPrice: 0.01,
    fixedMemoryPrice: 0.003,
    fixedStoragePrice: 0.036, // per GB per month (~$36/TB/month)
    storageTargetUtilization: 0.8, // Default storage utilization when pool-specific not set
    storagePoolConfigs: [], // Per-pool pricing and utilization
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
  }), []);

  // Use design-specific config or default - memoized to stabilize reference
  const config = useMemo(() =>
    activeDesign?.pricingConfig || defaultConfig,
    [activeDesign?.pricingConfig, defaultConfig]
  );

  const [pricingResult, setPricingResult] = useState<PricingModelResult | null>(null);

  // Extract just the selected cluster metrics to avoid re-renders from array changes
  const selectedClusterMetrics = useMemo(() => {
    if (selectedClusterId === 'all') {
      return null;
    }
    return clusterMetrics.find(c => c.clusterId === selectedClusterId) || null;
  }, [selectedClusterId, clusterMetrics]);

  // Ref to store previous costs to prevent unnecessary recalculations
  const previousCostsRef = useRef<string>('');
  const cachedCostsRef = useRef<typeof operationalCosts | null>(null);

  // Calculate proportional operational costs based on cluster selection
  // Use actual cluster-level costs from useComputeClusterMetrics, which properly accounts for
  // node costs, GPUs, and other expensive equipment, not just CPU cores
  const proportionalOperationalCosts = useMemo(() => {
    if (!selectedClusterMetrics) {
      // All clusters or no cluster found - use full costs
      const costsKey = JSON.stringify(operationalCosts);
      if (previousCostsRef.current !== costsKey) {
        previousCostsRef.current = costsKey;
        cachedCostsRef.current = operationalCosts;
      }
      return cachedCostsRef.current!;
    }

    // Use the cluster's proportionally allocated costs from useComputeClusterMetrics
    // This calculation is based on node count and actual component costs, accounting for
    // GPUs, storage, and other expensive equipment in the cluster
    const clusterNodeRatio = selectedClusterMetrics.totalComputeNodes > 0
      ? selectedClusterMetrics.totalNodes / selectedClusterMetrics.totalComputeNodes
      : 0;

    // Round values to avoid floating-point precision issues
    const racksMonthly = Math.round((selectedClusterMetrics.racksCost * clusterNodeRatio) * 100) / 100;
    const facilityMonthly = Math.round((selectedClusterMetrics.facilityCost * clusterNodeRatio) * 100) / 100;
    const energyMonthly = Math.round((selectedClusterMetrics.energyCost * clusterNodeRatio) * 100) / 100;
    const amortizedMonthly = Math.round(selectedClusterMetrics.computeAmortizedCost * 100) / 100;
    const licensingMonthly = Math.round((selectedClusterMetrics.licensingCost * clusterNodeRatio) * 100) / 100;
    const networkMonthly = Math.round(selectedClusterMetrics.networkAmortizedCost * 100) / 100;
    const totalMonthly = Math.round((selectedClusterMetrics.clusterCostShare + selectedClusterMetrics.operationalCostShare) * 100) / 100;

    const newCosts = {
      racksMonthly,
      facilityMonthly,
      energyMonthly,
      amortizedMonthly,
      licensingMonthly,
      networkMonthly,
      totalMonthly
    };

    // Only return new object if values have changed
    const costsKey = JSON.stringify(newCosts);
    if (previousCostsRef.current !== costsKey) {
      previousCostsRef.current = costsKey;
      cachedCostsRef.current = newCosts;
    }
    return cachedCostsRef.current!;
  }, [selectedClusterMetrics, operationalCosts]);

  // Create pricing service with proportional costs so VM Price Calculator uses correct cluster costs
  const pricingService = useMemo(() => {
    const clusterId = selectedClusterId === 'all' ? undefined : selectedClusterId;
    return new PricingModelService(activeDesign, config, componentTemplates, clusterId, proportionalOperationalCosts);
  }, [activeDesign, config, componentTemplates, selectedClusterId, proportionalOperationalCosts]);

  useEffect(() => {
    // Get available clusters
    const clusters = pricingService.getAvailableClusters();
    setAvailableClusters(clusters);

    // Calculate pricing
    const result = pricingService.calculatePricing();
    setPricingResult(result);
  }, [pricingService]);

  const handleConfigChange = (key: keyof PricingConfig, value: string | number | StoragePoolConfig[]) => {
    const updatedConfig = { ...config, [key]: value };
    updatePricingConfig(updatedConfig);
  };

  // Handle per-pool storage config updates (price and utilization)
  const handleStoragePoolConfigChange = (
    poolId: string,
    poolName: string,
    updates: { fixedPricePerGBMonth?: number; targetUtilization?: number }
  ) => {
    const currentConfigs = config.storagePoolConfigs || [];
    const existingIndex = currentConfigs.findIndex(p => p.poolId === poolId);
    const defaultUtil = config.storageTargetUtilization ?? config.targetUtilization;

    let newConfigs: StoragePoolConfig[];
    if (existingIndex >= 0) {
      newConfigs = [...currentConfigs];
      newConfigs[existingIndex] = {
        ...newConfigs[existingIndex],
        ...updates
      };
    } else {
      newConfigs = [...currentConfigs, {
        poolId,
        poolName,
        fixedPricePerGBMonth: updates.fixedPricePerGBMonth ?? config.fixedStoragePrice ?? 0.036,
        targetUtilization: updates.targetUtilization ?? defaultUtil
      }];
    }

    handleConfigChange('storagePoolConfigs', newConfigs);
  };

  // Get storage pool config (price and utilization)
  const getStoragePoolConfig = (poolId: string): { price: number; utilization: number } => {
    const poolConfig = config.storagePoolConfigs?.find(p => p.poolId === poolId);
    const defaultUtil = config.storageTargetUtilization ?? config.targetUtilization;
    return {
      price: poolConfig?.fixedPricePerGBMonth ?? config.fixedStoragePrice ?? 0.036,
      utilization: poolConfig?.targetUtilization ?? defaultUtil
    };
  };

  const marginPercentage = config.operatingModel === 'costPlus'
    ? (config.profitMargin - 1) * 100
    : (pricingResult?.effectiveMargin || 0) * 100;

  // Calculate breakeven utilization for fixed price mode (including storage)
  const breakevenUtilization = useMemo(() => {
    if (config.operatingModel !== 'fixedPrice' || !pricingResult) return null;

    const totalMonthlyCosts = proportionalOperationalCosts.totalMonthly;
    const usablevCPUs = pricingResult.clusterCapacity.usablevCPUs;
    const usableMemoryGB = pricingResult.clusterCapacity.usableMemoryGB;

    // Compute revenue at 100% utilization
    const maxComputeRevenue =
      (usablevCPUs * (config.fixedCpuPrice || 0.01) * 730) +
      (usableMemoryGB * (config.fixedMemoryPrice || 0.003) * 730);

    // Storage revenue at 100% utilization (using effective capacity before target util)
    const maxStorageRevenue = pricingResult.storageClusterCapacities.reduce((sum, sc) => {
      // Calculate max sellable at 100% utilization
      const maxSellableGB = sc.effectiveCapacityTiB * 1024; // TiB to GB
      return sum + (maxSellableGB * sc.pricePerGBMonth);
    }, 0);

    const maxMonthlyRevenue = maxComputeRevenue + maxStorageRevenue;

    if (maxMonthlyRevenue === 0) return null;

    // Breakeven utilization = costs / max revenue
    const breakeven = (totalMonthlyCosts / maxMonthlyRevenue) * 100;

    return breakeven;
  }, [config.operatingModel, config.fixedCpuPrice, config.fixedMemoryPrice, pricingResult, proportionalOperationalCosts.totalMonthly]);

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

      {/* Configuration Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Pricing Model Configuration</CardTitle>
              <CardDescription className="text-sm">
                Configure the pricing model for virtual workloads based on infrastructure costs
              </CardDescription>
            </div>
            {/* Export Buttons */}
            <div className="flex gap-2">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Operating Model and Profit Margin in same row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Operating Model Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Operating Model</Label>
              <RadioGroup
                value={config.operatingModel}
                onValueChange={(value) => handleConfigChange('operatingModel', value)}
                className="flex gap-4"
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
              <div className="lg:col-span-2 grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cpuPrice" className="text-sm flex items-center gap-1">
                    <Cpu className="h-3 w-3" />
                    vCPU
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cpuPrice"
                      type="number"
                      step="0.001"
                      value={config.fixedCpuPrice}
                      onChange={(e) => handleConfigChange('fixedCpuPrice', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">$/hr</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memPrice" className="text-sm flex items-center gap-1">
                    <MemoryStick className="h-3 w-3" />
                    Memory
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="memPrice"
                      type="number"
                      step="0.001"
                      value={config.fixedMemoryPrice}
                      onChange={(e) => handleConfigChange('fixedMemoryPrice', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">$/GB/hr</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storagePrice" className="text-sm flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    Storage
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="storagePrice"
                      type="number"
                      step="0.001"
                      value={config.fixedStoragePrice}
                      onChange={(e) => handleConfigChange('fixedStoragePrice', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">$/GB/mo</span>
                  </div>
                </div>
              </div>
            )}

            {/* Target Utilization - Compute */}
            <div className="space-y-2">
              <div className="flex items-center space-x-1">
                <Label htmlFor="targetUtil" className="text-sm font-medium">Compute Utilization</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Target compute cluster utilization for sellable capacity</p>
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

          {/* Storage Target Utilization - separate row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-1">
                <Label htmlFor="storageTargetUtil" className="text-sm font-medium">Storage Utilization</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Target storage utilization for sellable capacity (applies to all storage clusters)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  id="storageTargetUtil"
                  type="number"
                  step="5"
                  min="50"
                  max="100"
                  value={((config.storageTargetUtilization ?? config.targetUtilization) * 100).toFixed(0)}
                  onChange={(e) => {
                    const percentage = parseFloat(e.target.value) || 80;
                    handleConfigChange('storageTargetUtilization', percentage / 100);
                  }}
                  className="w-full"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          {/* Per-Pool Storage Configuration (Fixed Price Mode Only) */}
          {config.operatingModel === 'fixedPrice' && pricingResult && pricingResult.storageClusterCapacities.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-1">
                <Label className="text-sm font-medium">Storage Pool Configuration</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Set pricing and utilization per storage pool. Pools sharing a physical cluster have linked capacity - increasing one reduces available capacity for others.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {pricingResult.storageClusterCapacities.map((sc) => {
                  const poolConfig = getStoragePoolConfig(sc.id);
                  const hasCapacityError = sc.capacityError;
                  const maxUtil = Math.round(sc.maxAvailableUtilization * 100);

                  return (
                    <div
                      key={sc.id}
                      className={`p-3 rounded-lg space-y-3 ${hasCapacityError ? 'bg-red-50 dark:bg-red-950/20 border border-red-300 dark:border-red-800' : 'bg-muted/30'}`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HardDrive className={`h-4 w-4 ${hasCapacityError ? 'text-red-500' : 'text-muted-foreground'}`} />
                          <span className="text-sm font-medium truncate" title={sc.name}>{sc.name}</span>
                          {sc.isHyperConverged && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded">HCI</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{sc.poolType}</span>
                      </div>

                      {/* Physical cluster info for shared pools */}
                      {sc.otherPoolsConsumptionTiB > 0 && (
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          Physical cluster: {sc.physicalClusterName} ({sc.physicalClusterRawTiB.toFixed(1)} TiB raw)
                          <br />
                          Other pools using: {sc.otherPoolsConsumptionTiB.toFixed(1)} TiB raw
                        </div>
                      )}

                      {/* Capacity Error */}
                      {hasCapacityError && (
                        <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded font-medium">
                          ⚠️ Configuration exceeds physical capacity!
                          Total consumption: {sc.totalPhysicalConsumptionTiB.toFixed(1)} TiB / {sc.physicalClusterRawTiB.toFixed(1)} TiB available
                        </div>
                      )}

                      {/* Utilization Slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Target Utilization</span>
                          <span className={`font-medium ${hasCapacityError ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {Math.round(poolConfig.utilization * 100)}%
                            {sc.otherPoolsConsumptionTiB > 0 && (
                              <span className="text-muted-foreground ml-1">(max {maxUtil}%)</span>
                            )}
                          </span>
                        </div>
                        <Slider
                          value={[poolConfig.utilization * 100]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={([value]) => {
                            handleStoragePoolConfigChange(sc.id, sc.name, {
                              targetUtilization: value / 100
                            });
                          }}
                          className={hasCapacityError ? '**:[[role=slider]]:bg-red-500' : ''}
                        />
                        {/* Visual indicator for max available */}
                        {sc.otherPoolsConsumptionTiB > 0 && maxUtil < 100 && (
                          <div className="relative h-1 mt-1">
                            <div
                              className="absolute top-0 right-0 h-1 bg-orange-300 dark:bg-orange-700 rounded-r"
                              style={{ width: `${100 - maxUtil}%` }}
                              title={`${100 - maxUtil}% reserved by other pools`}
                            />
                          </div>
                        )}
                      </div>

                      {/* Price Input and Capacity */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.001"
                              min="0"
                              value={poolConfig.price}
                              onChange={(e) => handleStoragePoolConfigChange(sc.id, sc.name, {
                                fixedPricePerGBMonth: parseFloat(e.target.value) || 0
                              })}
                              className="h-7 text-sm"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">$/GB/mo</span>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <div className={hasCapacityError ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                            {sc.sellableCapacityTiB.toFixed(1)} TiB sellable
                          </div>
                          <div className="text-muted-foreground">
                            {formatMonthlyCurrency(sc.monthlyRevenue, currency)}/mo
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Virtualization Overhead */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Virtualization Overhead</Label>
            <div className="flex items-center gap-4">
              <RadioGroup
                value={config.virtualizationOverheadType}
                onValueChange={(value) => handleConfigChange('virtualizationOverheadType', value)}
                className="flex gap-4"
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
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Input
                      id="fixedCpuOverhead"
                      type="number"
                      step="1"
                      min="0"
                      value={config.virtualizationOverhead}
                      onChange={(e) => handleConfigChange('virtualizationOverhead', parseFloat(e.target.value) || 0)}
                      className="w-20"
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
                      className="w-20"
                    />
                    <span className="text-xs text-muted-foreground">GB</span>
                  </div>
                </div>
              )}
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
          <div className={`grid gap-4 ${config.operatingModel === 'fixedPrice' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Base Price per vCPU</p>
                    <p className="text-2xl font-bold">
                      {formatMonthlyCurrency(pricingResult.baseCostPerVCPU * 730, currency)}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPreciseCurrency(pricingResult.baseCostPerVCPU, currency)}/hr
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
                      {formatMonthlyCurrency(pricingResult.baseCostPerGBMemory * 730, currency)}/mo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPreciseCurrency(pricingResult.baseCostPerGBMemory, currency)}/hr
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

            {/* Breakeven Utilization - Only for Fixed Price Mode */}
            {config.operatingModel === 'fixedPrice' && breakevenUtilization !== null && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Breakeven Utilization</p>
                      <p className={`text-2xl font-bold ${breakevenUtilization > 100 ? 'text-red-600' : breakevenUtilization > 80 ? 'text-orange-600' : 'text-green-600'}`}>
                        {breakevenUtilization.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {breakevenUtilization > 100
                          ? 'Cannot break even at current prices'
                          : breakevenUtilization > config.targetUtilization * 100
                          ? 'Above target utilization'
                          : 'Margin positive at target'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Cost vs Price Analysis - Split into two cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>
                  Revenue and profit projections
                  {selectedClusterId !== 'all' && (
                    <span className="block mt-1 text-xs">
                      Cluster-specific analysis
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {/* Total Infrastructure Cost */}
                  <div className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Monthly Cost</p>
                      <p className="text-2xl font-bold">
                        {formatMonthlyCurrency(proportionalOperationalCosts.totalMonthly, currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">Infrastructure + operations</p>
                    </div>
                  </div>

                  {/* Sellable Capacity - Compute */}
                  <div className="flex justify-between items-start p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Sellable Compute Capacity</p>
                      <div className="flex gap-4 mt-1">
                        <div>
                          <p className="text-lg font-bold">{Math.round(pricingResult.clusterCapacity.sellingvCPUs)}</p>
                          <p className="text-xs text-muted-foreground">vCPUs</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{Math.round(pricingResult.clusterCapacity.sellingMemoryGB)}</p>
                          <p className="text-xs text-muted-foreground">GB RAM</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        At {(config.targetUtilization * 100).toFixed(0)}% utilization
                      </p>
                    </div>
                  </div>

                  {/* Sellable Capacity - Storage */}
                  {pricingResult.storageClusterCapacities.length > 0 && (
                    <div className="flex justify-between items-start p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Sellable Storage Capacity</p>
                        <div className="flex gap-4 mt-1">
                          <div>
                            <p className="text-lg font-bold">
                              {(pricingResult.totalSellableStorageGB / 1024).toFixed(1)}
                            </p>
                            <p className="text-xs text-muted-foreground">TiB</p>
                          </div>
                          <div>
                            <p className="text-lg font-bold">{pricingResult.storageClusterCapacities.length}</p>
                            <p className="text-xs text-muted-foreground">Pool{pricingResult.storageClusterCapacities.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          At {((config.storageTargetUtilization ?? config.targetUtilization) * 100).toFixed(0)}% utilization
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Total Revenue Potential */}
                  <div className="flex justify-between items-start p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="w-full">
                      <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                      {(() => {
                        const computeRevenue =
                          (pricingResult.clusterCapacity.sellingvCPUs * pricingResult.baseCostPerVCPU * 730) +
                          (pricingResult.clusterCapacity.sellingMemoryGB * pricingResult.baseCostPerGBMemory * 730);
                        const storageRevenue = pricingResult.totalStorageMonthlyRevenue;
                        const totalRevenue = computeRevenue + storageRevenue;

                        return (
                          <>
                            <p className="text-2xl font-bold text-blue-600">
                              {formatMonthlyCurrency(totalRevenue, currency)}
                            </p>
                            {storageRevenue > 0 && (
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                <div className="flex justify-between">
                                  <span>Compute:</span>
                                  <span>{formatMonthlyCurrency(computeRevenue, currency)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Storage:</span>
                                  <span>{formatMonthlyCurrency(storageRevenue, currency)}</span>
                                </div>
                              </div>
                            )}
                            {storageRevenue === 0 && (
                              <p className="text-xs text-muted-foreground">At target utilization</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Monthly Profit */}
                  <div className="flex justify-between items-start p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Profit</p>
                      {(() => {
                        const computeRevenue =
                          (pricingResult.clusterCapacity.sellingvCPUs * pricingResult.baseCostPerVCPU * 730) +
                          (pricingResult.clusterCapacity.sellingMemoryGB * pricingResult.baseCostPerGBMemory * 730);
                        const storageRevenue = pricingResult.totalStorageMonthlyRevenue;
                        const totalRevenue = computeRevenue + storageRevenue;
                        const monthlyProfit = totalRevenue - proportionalOperationalCosts.totalMonthly;
                        const isPositive = monthlyProfit >= 0;
                        const effectiveMargin = proportionalOperationalCosts.totalMonthly > 0
                          ? ((totalRevenue - proportionalOperationalCosts.totalMonthly) / proportionalOperationalCosts.totalMonthly) * 100
                          : 0;
                        return (
                          <>
                            <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {formatMonthlyCurrency(Math.round(monthlyProfit), currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {effectiveMargin.toFixed(1)}% margin
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Cost Breakdown</CardTitle>
                <CardDescription>
                  Detailed infrastructure and operational costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {proportionalOperationalCosts.amortizedMonthly > 0 && (
                    <div className="flex justify-between text-sm p-2 hover:bg-muted/30 rounded">
                      <span className="text-muted-foreground">Hardware Amortization</span>
                      <span className="font-medium">{formatMonthlyCurrency(proportionalOperationalCosts.amortizedMonthly, currency)}</span>
                    </div>
                  )}
                  {proportionalOperationalCosts.energyMonthly > 0 && (
                    <div className="flex justify-between text-sm p-2 hover:bg-muted/30 rounded">
                      <span className="text-muted-foreground">Energy Costs</span>
                      <span className="font-medium">{formatMonthlyCurrency(proportionalOperationalCosts.energyMonthly, currency)}</span>
                    </div>
                  )}
                  {proportionalOperationalCosts.racksMonthly > 0 && (
                    <div className="flex justify-between text-sm p-2 hover:bg-muted/30 rounded">
                      <span className="text-muted-foreground">Rack Costs</span>
                      <span className="font-medium">{formatMonthlyCurrency(proportionalOperationalCosts.racksMonthly, currency)}</span>
                    </div>
                  )}
                  {proportionalOperationalCosts.facilityMonthly > 0 && (
                    <div className="flex justify-between text-sm p-2 hover:bg-muted/30 rounded">
                      <span className="text-muted-foreground">Facility Costs</span>
                      <span className="font-medium">{formatMonthlyCurrency(proportionalOperationalCosts.facilityMonthly, currency)}</span>
                    </div>
                  )}
                  {proportionalOperationalCosts.licensingMonthly > 0 && (
                    <div className="flex justify-between text-sm p-2 hover:bg-muted/30 rounded">
                      <span className="text-muted-foreground">Licensing</span>
                      <span className="font-medium">{formatMonthlyCurrency(proportionalOperationalCosts.licensingMonthly, currency)}</span>
                    </div>
                  )}
                  {proportionalOperationalCosts.networkMonthly > 0 && (
                    <div className="flex justify-between text-sm p-2 hover:bg-muted/30 rounded">
                      <span className="text-muted-foreground">Network Operations</span>
                      <span className="font-medium">{formatMonthlyCurrency(proportionalOperationalCosts.networkMonthly, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium pt-3 mt-3 border-t p-2 bg-muted/50 rounded">
                    <span>Total Monthly Cost</span>
                    <span>{formatMonthlyCurrency(proportionalOperationalCosts.totalMonthly, currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Capacity Breakdown */}
          <CapacityBreakdown
            capacity={pricingResult.clusterCapacity}
            storageCapacities={pricingResult.storageClusterCapacities}
          />

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