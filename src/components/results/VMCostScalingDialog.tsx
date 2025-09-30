import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, AlertCircle, Loader2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ComputeClusterMetrics } from '@/hooks/design/useComputeClusterMetrics';
import {
  useVMCostScalingAsync,
  getRecommendedScalingRange,
  VMCostScalingConfig
} from '@/hooks/design/useVMCostScalingAsync';
import { VMCostScalingChart } from './VMCostScalingChart';
import { VMScalingProgress } from './VMScalingProgress';

interface VMCostScalingDialogProps {
  clusterMetrics: ComputeClusterMetrics[];
}

export const VMCostScalingDialog: React.FC<VMCostScalingDialogProps> = ({ clusterMetrics }) => {
  const [open, setOpen] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState<string>('');
  const [minNodes, setMinNodes] = useState<number>(0);
  const [maxNodes, setMaxNodes] = useState<number>(0);
  const [increment, setIncrement] = useState<number>(1);

  // Get the selected cluster
  const selectedCluster = useMemo(
    () => clusterMetrics.find(c => c.clusterId === selectedClusterId),
    [clusterMetrics, selectedClusterId]
  );

  // Initialize with first cluster and recommended range when dialog opens
  React.useEffect(() => {
    if (open && clusterMetrics.length > 0 && !selectedClusterId) {
      const firstCluster = clusterMetrics[0];
      setSelectedClusterId(firstCluster.clusterId);
      const recommended = getRecommendedScalingRange(firstCluster);
      setMinNodes(recommended.minNodes);
      setMaxNodes(recommended.maxNodes);
      setIncrement(recommended.increment);
    }
  }, [open, clusterMetrics, selectedClusterId]);

  // Update range when cluster selection changes
  const handleClusterChange = (clusterId: string) => {
    setSelectedClusterId(clusterId);
    const cluster = clusterMetrics.find(c => c.clusterId === clusterId);
    if (cluster) {
      const recommended = getRecommendedScalingRange(cluster);
      setMinNodes(recommended.minNodes);
      setMaxNodes(recommended.maxNodes);
      setIncrement(recommended.increment);
    }
  };

  // Create scaling config
  const scalingConfig: VMCostScalingConfig | null = useMemo(() => {
    if (!selectedClusterId || minNodes <= 0 || maxNodes <= 0) return null;
    return {
      clusterId: selectedClusterId,
      minNodes,
      maxNodes,
      increment: Math.max(1, increment)
    };
  }, [selectedClusterId, minNodes, maxNodes, increment]);

  // Use async scaling hook
  const {
    status,
    progress,
    currentNodeCount,
    results,
    error: simulationError,
    estimatedTimeRemaining,
    startSimulation,
    cancelSimulation,
    resetSimulation,
    isRunning,
    isCompleted,
    hasError,
    canStart
  } = useVMCostScalingAsync();

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!selectedCluster) return errors;

    if (minNodes < selectedCluster.redundantNodes + 1) {
      errors.push(
        `Minimum nodes must be at least ${selectedCluster.redundantNodes + 1} to maintain ${selectedCluster.redundancyConfig} redundancy`
      );
    }

    if (minNodes >= maxNodes) {
      errors.push('Maximum nodes must be greater than minimum nodes');
    }

    if (increment < 1 || increment > 20) {
      errors.push('Increment must be between 1 and 20 nodes');
    }

    if ((maxNodes - minNodes) / increment > 100) {
      errors.push('Configuration would generate too many data points. Increase increment or reduce range.');
    }

    return errors;
  }, [selectedCluster, minNodes, maxNodes, increment]);

  const canGenerate = validationErrors.length === 0 && !!scalingConfig;

  // Handle Generate Analysis button click
  const handleGenerateAnalysis = () => {
    if (!scalingConfig || !selectedCluster) return;
    startSimulation(scalingConfig, selectedCluster);
  };

  // Handle Retry button click
  const handleRetry = () => {
    resetSimulation();
  };

  // Calculate expected data points
  const expectedDataPoints = useMemo(() => {
    if (!scalingConfig) return 0;
    return Math.floor((scalingConfig.maxNodes - scalingConfig.minNodes) / scalingConfig.increment) + 1;
  }, [scalingConfig]);

  // Reset to recommended values
  const handleResetToRecommended = () => {
    if (selectedCluster) {
      const recommended = getRecommendedScalingRange(selectedCluster);
      setMinNodes(recommended.minNodes);
      setMaxNodes(recommended.maxNodes);
      setIncrement(recommended.increment);
    }
  };

  if (clusterMetrics.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Analyze Scaling
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>VM Cost Scaling Analysis</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Configuration Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-4">
              <div>
                <Label htmlFor="cluster-select">Compute Cluster</Label>
                <Select value={selectedClusterId} onValueChange={handleClusterChange} disabled={isRunning}>
                  <SelectTrigger id="cluster-select">
                    <SelectValue placeholder="Select cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    {clusterMetrics.map(cluster => (
                      <SelectItem key={cluster.clusterId} value={cluster.clusterId}>
                        {cluster.clusterName} ({cluster.totalNodes} nodes)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCluster && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {selectedCluster.totalNodes} nodes, {selectedCluster.maxAverageVMs} VMs,
                    ${selectedCluster.monthlyCostPerVM.toFixed(2)}/VM
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="min-nodes">Minimum Nodes</Label>
                <Input
                  id="min-nodes"
                  type="number"
                  min={selectedCluster?.redundantNodes || 1}
                  value={minNodes}
                  onChange={(e) => setMinNodes(parseInt(e.target.value) || 0)}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must maintain redundancy requirements
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="max-nodes">Maximum Nodes</Label>
                <Input
                  id="max-nodes"
                  type="number"
                  min={minNodes + 1}
                  value={maxNodes}
                  onChange={(e) => setMaxNodes(parseInt(e.target.value) || 0)}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upper bound for analysis
                </p>
              </div>

              <div>
                <Label htmlFor="increment">Increment (nodes per step)</Label>
                <Input
                  id="increment"
                  type="number"
                  min={1}
                  max={20}
                  value={increment}
                  onChange={(e) => setIncrement(parseInt(e.target.value) || 1)}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Larger increments = faster generation, fewer data points
                </p>
              </div>
            </div>

            <div className="col-span-full flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetToRecommended}
                disabled={isRunning}
              >
                Reset to Recommended
              </Button>
              <div className="flex items-center gap-4">
                {!isRunning && !isCompleted && (
                  <p className="text-sm text-muted-foreground">
                    {expectedDataPoints > 0 ? `Will generate ${expectedDataPoints} data points` : 'Configure to generate'}
                  </p>
                )}
                {isRunning ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelSimulation}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGenerateAnalysis}
                    disabled={!canGenerate || !canStart}
                    className="gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Generate Analysis
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && !isRunning && !isCompleted && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Progress Indicator */}
          {isRunning && (
            <VMScalingProgress
              progress={progress}
              currentNodeCount={currentNodeCount}
              estimatedTimeRemaining={estimatedTimeRemaining}
              onCancel={cancelSimulation}
            />
          )}

          {/* Error Display */}
          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Simulation Error</p>
                  <p className="text-sm mt-1">{simulationError || 'Unknown error occurred'}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Chart Display */}
          {isCompleted && results.length > 0 && selectedCluster && (
            <VMCostScalingChart
              data={results}
              currentNodeCount={selectedCluster.totalNodes}
              clusterName={selectedCluster.clusterName}
            />
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-semibold mb-2">About This Analysis:</p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>
                • Performs full design recalculation for each node count (not extrapolation)
              </li>
              <li>
                • Results match what you would see if manually changing requirements
              </li>
              <li>
                • Accounts for infrastructure scaling: racks, switches, power, and facility costs
              </li>
              <li>
                • Maintains the same redundancy, overcommit, and configuration as your current design
              </li>
              <li>
                • Expected time: {expectedDataPoints > 0 ? `~${Math.ceil(expectedDataPoints * 0.5)}-${Math.ceil(expectedDataPoints * 1.5)} seconds` : 'varies by configuration'}
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};