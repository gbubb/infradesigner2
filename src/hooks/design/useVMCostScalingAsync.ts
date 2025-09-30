/**
 * Async VM Cost Scaling Hook
 *
 * Manages asynchronous execution of VM cost scaling simulations with progress tracking
 * and cancellation support. Each simulation performs a full design recalculation for
 * accurate cost predictions at different node counts.
 *
 * Key features:
 * - Sequential simulation execution to avoid resource contention
 * - Real-time progress updates for responsive UI
 * - Cancellation support via ref-based flag pattern
 * - Graceful error handling for individual simulation failures
 * - State isolation - no mutations to main store during simulation
 */

import { useState, useCallback, useRef } from 'react';
import { useDesignStore } from '@/store/designStore';
import {
  simulateDesignConfiguration,
  cloneAndModifyRequirements,
  SimulationResult,
  RoleAssignmentMap
} from '@/services/designSimulationService';
import { ComputeClusterMetrics } from './useComputeClusterMetrics';

// Simulation state management
export type SimulationStatus = 'idle' | 'running' | 'completed' | 'error' | 'cancelled';

export interface SimulationProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface SimulationState {
  status: SimulationStatus;
  progress: SimulationProgress;
  currentNodeCount: number | null;
  results: SimulationResult[];
  error: string | null;
  startTime: number | null;
  estimatedTimeRemaining: number | null;
}

export interface VMCostScalingConfig {
  clusterId: string;
  minNodes: number;
  maxNodes: number;
  increment: number;
}

/**
 * Hook for managing asynchronous VM cost scaling simulations
 */
export const useVMCostScalingAsync = () => {
  // Cancellation flag (ref to avoid re-renders)
  const cancelledRef = useRef<boolean>(false);

  // Simulation state
  const [state, setState] = useState<SimulationState>({
    status: 'idle',
    progress: { current: 0, total: 0, percentage: 0 },
    currentNodeCount: null,
    results: [],
    error: null,
    startTime: null,
    estimatedTimeRemaining: null
  });

  /**
   * Start simulation with the specified configuration
   */
  const startSimulation = useCallback(async (
    config: VMCostScalingConfig,
    clusterMetrics: ComputeClusterMetrics
  ): Promise<void> => {
    // Reset cancellation flag
    cancelledRef.current = false;

    // Validate configuration
    if (config.minNodes > config.maxNodes) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Minimum nodes cannot be greater than maximum nodes'
      }));
      return;
    }

    if (config.increment <= 0) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Increment must be greater than zero'
      }));
      return;
    }

    try {
      // Get current store state
      const store = useDesignStore.getState();
      const requirements = store.requirements;
      const componentTemplates = store.componentTemplates || [];

      if (!requirements) {
        throw new Error('Design requirements not found');
      }

      // Build role assignment map from current design
      const roleAssignments: RoleAssignmentMap = {};
      const roles = store.componentRoles || [];
      roles.forEach(role => {
        if (role.assignedComponentId) {
          // Support both simple role keys and cluster-specific keys
          roleAssignments[role.role] = role.assignedComponentId;
          if (role.clusterInfo?.clusterId) {
            roleAssignments[`${role.role}-${role.clusterInfo.clusterId}`] = role.assignedComponentId;
          }
        }
      });

      // Get average VM specs from requirements
      const averageVMVCPUs = requirements.computeRequirements?.averageVMVCPUs || 6;
      const averageVMMemoryGB = requirements.computeRequirements?.averageVMMemoryGB || 18;

      // Generate array of target node counts
      const targetNodeCounts: number[] = [];
      for (let nodeCount = config.minNodes; nodeCount <= config.maxNodes; nodeCount += config.increment) {
        targetNodeCounts.push(nodeCount);
      }

      // Initialize state for running simulation
      const startTime = Date.now();
      setState({
        status: 'running',
        progress: { current: 0, total: targetNodeCounts.length, percentage: 0 },
        currentNodeCount: null,
        results: [],
        error: null,
        startTime,
        estimatedTimeRemaining: null
      });

      const results: SimulationResult[] = [];

      // Process simulations sequentially
      for (let i = 0; i < targetNodeCounts.length; i++) {
        // Check for cancellation
        if (cancelledRef.current) {
          setState(prev => ({
            ...prev,
            status: 'cancelled',
            progress: { ...prev.progress, current: i },
            currentNodeCount: null
          }));
          return;
        }

        const targetNodeCount = targetNodeCounts[i];

        // Update progress state
        setState(prev => ({
          ...prev,
          currentNodeCount: targetNodeCount,
          progress: {
            current: i,
            total: targetNodeCounts.length,
            percentage: Math.round((i / targetNodeCounts.length) * 100)
          }
        }));

        try {
          // Clone and modify requirements for this target node count
          const modifiedRequirements = cloneAndModifyRequirements(
            requirements,
            config.clusterId,
            targetNodeCount
          );

          // Run full simulation
          const result = simulateDesignConfiguration(
            modifiedRequirements,
            componentTemplates,
            roleAssignments,
            averageVMVCPUs,
            averageVMMemoryGB
          );

          results.push(result);

          // Calculate estimated time remaining
          const elapsedTime = Date.now() - startTime;
          const avgTimePerSim = elapsedTime / (i + 1);
          const remainingSims = targetNodeCounts.length - (i + 1);
          const estimatedTimeRemaining = Math.round((avgTimePerSim * remainingSims) / 1000); // in seconds

          // Update state with new result and time estimate
          setState(prev => ({
            ...prev,
            results: [...results],
            estimatedTimeRemaining
          }));

        } catch (error) {
          console.error(`Simulation failed for ${targetNodeCount} nodes:`, error);
          // Continue with next simulation - don't fail entire operation
          // Could optionally track failed simulations
        }

        // Small delay to allow UI updates (10ms)
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Mark as completed
      setState(prev => ({
        ...prev,
        status: 'completed',
        currentNodeCount: null,
        progress: {
          current: targetNodeCounts.length,
          total: targetNodeCounts.length,
          percentage: 100
        },
        estimatedTimeRemaining: 0
      }));

    } catch (error) {
      console.error('Simulation error:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown simulation error',
        currentNodeCount: null
      }));
    }
  }, []);

  /**
   * Cancel ongoing simulation
   */
  const cancelSimulation = useCallback(() => {
    cancelledRef.current = true;
    // State update happens in the simulation loop
  }, []);

  /**
   * Reset simulation state to idle
   */
  const resetSimulation = useCallback(() => {
    cancelledRef.current = false;
    setState({
      status: 'idle',
      progress: { current: 0, total: 0, percentage: 0 },
      currentNodeCount: null,
      results: [],
      error: null,
      startTime: null,
      estimatedTimeRemaining: null
    });
  }, []);

  return {
    // State
    status: state.status,
    progress: state.progress,
    currentNodeCount: state.currentNodeCount,
    results: state.results,
    error: state.error,
    estimatedTimeRemaining: state.estimatedTimeRemaining,

    // Actions
    startSimulation,
    cancelSimulation,
    resetSimulation,

    // Computed properties
    isRunning: state.status === 'running',
    isCompleted: state.status === 'completed',
    hasError: state.status === 'error',
    isCancelled: state.status === 'cancelled',
    canStart: state.status === 'idle' || state.status === 'completed' || state.status === 'error' || state.status === 'cancelled'
  };
};

/**
 * Calculate recommended scaling range based on cluster configuration
 */
export const getRecommendedScalingRange = (
  clusterMetrics: ComputeClusterMetrics
): { minNodes: number; maxNodes: number; increment: number } => {
  const currentNodes = clusterMetrics.totalNodes;
  const redundantNodes = clusterMetrics.redundantNodes;

  // Minimum: Must maintain redundancy requirements (can't go below redundant nodes + 1)
  const minNodes = Math.max(redundantNodes + 1, Math.ceil(currentNodes * 0.5));

  // Maximum: 200% of current, but reasonable upper bound
  const maxNodes = Math.min(Math.ceil(currentNodes * 3), currentNodes + 100);

  // Increment: Scale with cluster size
  const increment = currentNodes <= 10 ? 1 : currentNodes <= 50 ? 2 : 5;

  return { minNodes, maxNodes, increment };
};
