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
  cloneAndScaleRequirements,
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
  minScaleFactor: number;  // e.g., 0.5 for half current vCPUs
  maxScaleFactor: number;  // e.g., 3.0 for triple current vCPUs
  steps: number;           // number of data points to generate
}

/**
 * Calculate recommended scaling range based on current cluster configuration
 */
export const getRecommendedScalingRange = (clusterMetrics: ComputeClusterMetrics) => {
  // Suggest scaling from 0.5x to 3x current vCPUs
  // This typically gives a good range for cost analysis
  return {
    minScaleFactor: 0.5,
    maxScaleFactor: 3.0,
    steps: 10  // 10 data points across the range
  };
};

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

      // Generate array of scale factors
      const scaleFactors: number[] = [];
      const scaleRange = config.maxScaleFactor - config.minScaleFactor;
      const stepSize = config.steps > 1 ? scaleRange / (config.steps - 1) : 0;

      for (let i = 0; i < config.steps; i++) {
        const scaleFactor = config.minScaleFactor + (stepSize * i);
        scaleFactors.push(scaleFactor);
      }

      // Initialize state for running simulation
      const startTime = Date.now();
      setState({
        status: 'running',
        progress: { current: 0, total: scaleFactors.length, percentage: 0 },
        currentNodeCount: null,
        results: [],
        error: null,
        startTime,
        estimatedTimeRemaining: null
      });

      const results: SimulationResult[] = [];

      // Process simulations sequentially
      for (let i = 0; i < scaleFactors.length; i++) {
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

        const scaleFactor = scaleFactors[i];

        // Update progress state
        setState(prev => ({
          ...prev,
          currentNodeCount: null, // Will be determined by simulation
          progress: {
            current: i,
            total: scaleFactors.length,
            percentage: Math.round((i / scaleFactors.length) * 100)
          }
        }));

        try {
          // Clone and scale requirements by this factor
          const modifiedRequirements = cloneAndScaleRequirements(
            requirements,
            config.clusterId,
            scaleFactor
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

          // Update current node count from result
          setState(prev => ({
            ...prev,
            currentNodeCount: result.nodeCount
          }));

          // Calculate estimated time remaining
          const elapsedTime = Date.now() - startTime;
          const avgTimePerSim = elapsedTime / (i + 1);
          const remainingSims = scaleFactors.length - (i + 1);
          const estimatedTimeRemaining = Math.round((avgTimePerSim * remainingSims) / 1000); // in seconds

          // Update state with new result and time estimate
          setState(prev => ({
            ...prev,
            results: [...results],
            estimatedTimeRemaining
          }));

        } catch (error) {
          console.error(`Simulation failed for scale factor ${scaleFactor.toFixed(2)}:`, error);
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
          current: scaleFactors.length,
          total: scaleFactors.length,
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

