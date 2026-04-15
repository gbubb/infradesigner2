import { InfrastructureDesign, InfrastructureComponent, ComponentRole } from '@/types/infrastructure';
import { PlacedComponent, ComputeCluster } from '@/types/placement';

// Per-storage-pool pricing and utilization configuration
export interface StoragePoolConfig {
  poolId: string;
  poolName: string;
  fixedPricePerGBMonth: number; // $/GB/month for this pool
  targetUtilization: number; // 0-1, target utilization for this specific pool
}

// Legacy: Per-storage-cluster pricing configuration (deprecated, use StoragePoolConfig)
export interface StorageClusterPricing {
  clusterId: string;
  clusterName: string;
  fixedPricePerGBMonth: number; // $/GB/month for this cluster
}

export interface PricingConfig {
  operatingModel: 'costPlus' | 'fixedPrice';
  profitMargin: number; // Multiplier for cost plus model (e.g., 1.3 = 30% margin)
  fixedCpuPrice?: number; // $/vCPU/hour for fixed price model
  fixedMemoryPrice?: number; // $/GB/hour for fixed price model
  fixedStoragePrice?: number; // $/GB/month for fixed price model (default/fallback)
  storageTargetUtilization?: number; // Default storage utilization (0-1), used when pool-specific not set
  storagePoolConfigs?: StoragePoolConfig[]; // Per-pool pricing and utilization
  storageClusterPricing?: StorageClusterPricing[]; // Legacy: Per-cluster storage pricing
  targetUtilization: number; // Target cluster utilization (0-1)
  virtualizationOverhead: number; // Overhead percentage (0-1) or fixed vCPUs
  virtualizationOverheadType: 'percentage' | 'fixed'; // New field
  virtualizationOverheadMemory?: number; // Fixed memory overhead in GB (when type is 'fixed')
  sizePenaltyFactor: number; // Ratio premium multiplier for VMs that deviate from natural ratio
  ratioPenaltyExponent?: number; // Exponent for ratio penalty curve (1=linear, 2=quadratic, 3=cubic)
  vmSizePenaltyFactor?: number; // Base size premium multiplier for large VMs
  vmSizeCurveExponent?: number; // Exponent for size premium curve (1=linear, 2=quadratic, 3=cubic)
  vmSizeThreshold?: number; // vCPU count where size premium starts to apply significantly
  vmSizeAcceleration?: number; // Rate at which premium accelerates with size (0-1)
}

export interface VMPricing {
  vCPU: number;
  memoryGB: number;
  storageGB: number;
  baseHourlyPrice: number;
  monthlyPrice: number;
  breakdown: {
    computeCost: number;
    networkCost: number;
    storageCost: number;
    licensingCost: number;
    haOverheadMultiplier: number;
    sizePenalty: number; // Combined premium from ratio and size
    ratioPenalty: number; // Premium for deviating from natural ratio
    vmSizePenalty: number; // Premium for large VM scheduling challenges
    ratioDeviation: number;
    effectiveMargin: number;
  };
}

export interface ClusterCapacity {
  totalPhysicalCores: number;
  totalPhysicalMemoryGB: number;
  totalPhysicalNodes: number;  // Added to track actual node count
  totalvCPUs: number;
  totalMemoryGB: number;
  usablevCPUs: number;
  usableMemoryGB: number;
  sellingvCPUs: number;
  sellingMemoryGB: number;
  haReservation: number;
  virtualizationOverhead: number;
  targetUtilization: number;
  // Hyper-converged storage overhead
  isHyperConverged?: boolean;
  storageOverheadCores?: number;
  storageOverheadMemoryGB?: number;
  totalDisksInCluster?: number;
  cpuCoresPerDisk?: number;
  memoryGBPerDisk?: number;
}

// Storage cluster capacity breakdown
export interface StorageClusterCapacity {
  id: string;
  name: string;
  poolType: string; // '3 Replica', 'Erasure Coding 8+3', etc.
  isHyperConverged: boolean;
  // Physical storage cluster info (for shared capacity tracking)
  physicalClusterId: string;
  physicalClusterName: string;
  // Raw capacity for this pool (may be shared with other pools)
  totalRawCapacityTB: number;
  totalRawCapacityTiB: number;
  // Physical cluster's total raw capacity (shared across all pools targeting it)
  physicalClusterRawTiB: number;
  // After replication/EC overhead
  poolEfficiencyFactor: number;
  usableCapacityTB: number;
  usableCapacityTiB: number;
  // After max fill factor
  maxFillFactor: number;
  effectiveCapacityTiB: number;
  // Target utilization for this specific pool
  targetUtilization: number;
  // Raw consumption at target utilization
  rawConsumptionTiB: number;
  // Sellable capacity at target utilization
  sellableCapacityTiB: number;
  sellableCapacityGB: number;
  // Shared capacity validation
  maxAvailableUtilization: number; // Max utilization this pool can use given other pools' consumption
  capacityError: boolean; // True if total consumption exceeds physical capacity
  totalPhysicalConsumptionTiB: number; // Total raw consumption across all pools on same physical cluster
  otherPoolsConsumptionTiB: number; // Raw consumption by other pools on same physical cluster
  // Cost metrics
  totalCost: number;
  costPerUsableTiB: number;
  // Pricing (for fixed price mode)
  pricePerGBMonth: number;
  monthlyRevenue: number;
}

export interface PricingModelResult {
  clusterCapacity: ClusterCapacity;
  storageClusterCapacities: StorageClusterCapacity[];
  cpuMemoryWeightRatio: number;
  baseCostPerVCPU: number;
  baseCostPerGBMemory: number;
  effectiveMargin: number;
  samplePrices: VMPricing[];
  // Storage revenue metrics
  totalSellableStorageGB: number;
  totalStorageMonthlyRevenue: number;
}

export interface ExternalOperationalCosts {
  totalMonthly: number;
  licensingMonthly?: number;
  amortizedMonthly?: number;
  energyMonthly?: number;
  racksMonthly?: number;
  facilityMonthly?: number;
  networkMonthly?: number;
}

export class PricingModelService {
  private design: InfrastructureDesign | null;
  private config: PricingConfig;
  private selectedClusterId?: string;
  private componentTemplates: InfrastructureComponent[];
  private externalOperationalCosts?: ExternalOperationalCosts;

  constructor(
    design: InfrastructureDesign | null,
    config: PricingConfig,
    componentTemplates: InfrastructureComponent[] = [],
    selectedClusterId?: string,
    externalOperationalCosts?: ExternalOperationalCosts
  ) {
    this.design = design;
    this.config = config;
    this.componentTemplates = componentTemplates;
    this.selectedClusterId = selectedClusterId;
    this.externalOperationalCosts = externalOperationalCosts;
  }

  public getConfig(): PricingConfig {
    return this.config;
  }

  public getAvailableClusters(): ComputeCluster[] {
    if (!this.design || !this.design.componentRoles) {
      return [];
    }

    const clusters: ComputeCluster[] = [];
    const clusterMap = new Map<string, {
      roles: ComponentRole[],
      name: string,
      isHyperConverged: boolean,
      gpuEnabled: boolean
    }>();

    // Group component roles by cluster - specifically looking for compute-related roles
    this.design.componentRoles.forEach(role => {
      if (!role.assignedComponentId) return;
      
      // Check if this is a compute-related role based on the role name
      const isComputeRole = 
        role.role === 'computeNode' || 
        role.role === 'hyperConvergedNode' || 
        role.role === 'gpuNode';
      
      if (!isComputeRole) return;

      const clusterId = role.clusterInfo?.clusterId || role.role;
      const clusterName = role.clusterInfo?.clusterName || role.role;
      
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, {
          roles: [],
          name: clusterName,
          isHyperConverged: role.role === 'hyperConvergedNode',
          gpuEnabled: role.role === 'gpuNode'
        });
      }
      
      clusterMap.get(clusterId)?.roles.push(role);
    });

    // Create cluster objects
    clusterMap.forEach((clusterData, clusterId) => {
      const { roles, name } = clusterData;
      
      // Find the component details from componentTemplates
      const firstRole = roles[0];
      const component = this.componentTemplates.find(
        (c) => c.id === firstRole.assignedComponentId
      );
      
      if (!component) {
        console.log('[PricingModelService] Could not find component for role:', firstRole);
        return;
      }

      // Calculate total nodes - use adjustedRequiredCount (after component selection) not requiredCount (initial estimate)
      const nodeCount = roles.reduce((sum, role) => 
        sum + (role.adjustedRequiredCount || role.requiredCount || 0), 0
      );

      // Get component specifications - check for socket-based calculation first
      let cores = 0;
      if (component.cpuSockets && component.cpuCoresPerSocket) {
        cores = component.cpuSockets * component.cpuCoresPerSocket;
      } else if (component.specifications?.cpu?.cores) {
        cores = component.specifications.cpu.cores;
      } else if (component.cpu?.cores) {
        cores = component.cpu.cores;
      } else if (component.cpuCores) {
        cores = component.cpuCores;
      } else if (component.coreCount) {
        cores = component.coreCount;
      } else if (component.cores) {
        cores = component.cores;
      } else if (component.totalCores) {
        cores = component.totalCores;
      }
      
      const memory = component.memoryCapacity || 
                    component.specifications?.memory?.capacity || 
                    component.memory?.capacity || 
                    component.memoryGB || 0;
      const gpuCount = component.specifications?.gpu?.quantity || 
                      component.gpu?.quantity || 0;

      clusters.push({
        id: clusterId,
        name,
        role: firstRole.role,
        nodeType: component,
        nodeCount,
        specifications: {
          totalCores: cores * nodeCount,
          totalMemoryGB: memory * nodeCount,
          gpuCount: gpuCount * nodeCount
        }
      });
    });

    console.log('[PricingModelService] Available clusters:', clusters);
    return clusters;
  }

  calculatePricing(): PricingModelResult {
    const clusterCapacity = this.calculateClusterCapacity();
    const storageClusterCapacities = this.calculateStorageClusterCapacities();
    const infrastructureCosts = this.calculateInfrastructureCosts();
    const cpuMemoryRatio = this.calculateCpuMemoryWeightRatio(clusterCapacity);

    const baseCosts = this.calculateBaseCosts(
      infrastructureCosts,
      clusterCapacity,
      cpuMemoryRatio
    );

    const samplePrices = this.generateSamplePrices(baseCosts, clusterCapacity);

    // Calculate total storage metrics
    const totalSellableStorageGB = storageClusterCapacities.reduce(
      (sum, sc) => sum + sc.sellableCapacityGB, 0
    );
    const totalStorageMonthlyRevenue = storageClusterCapacities.reduce(
      (sum, sc) => sum + sc.monthlyRevenue, 0
    );

    return {
      clusterCapacity,
      storageClusterCapacities,
      cpuMemoryWeightRatio: cpuMemoryRatio,
      baseCostPerVCPU: baseCosts.cpuCost,
      baseCostPerGBMemory: baseCosts.memoryCost,
      effectiveMargin: this.calculateEffectiveMargin(baseCosts, infrastructureCosts),
      samplePrices,
      totalSellableStorageGB,
      totalStorageMonthlyRevenue
    };
  }

  public calculateStorageClusterCapacities(): StorageClusterCapacity[] {
    if (!this.design?.requirements?.storageRequirements?.storagePools) {
      return [];
    }

    const TB_TO_TIB = 0.909495;
    const TIB_TO_GB = 1024;
    const storagePools = this.design.requirements.storageRequirements.storagePools;
    const storageClusters = this.design.requirements.storageRequirements.storageClusters || [];
    const designComponents = this.design.components as InfrastructureComponent[] || [];

    // Storage pool efficiency factors
    const poolEfficiencyFactors: Record<string, number> = {
      '3 Replica': 0.33333,
      '2 Replica': 0.5,
      'Erasure Coding 4+2': 0.66666,
      'Erasure Coding 8+3': 0.72727,
      'Erasure Coding 8+4': 0.66666,
      'Erasure Coding 10+4': 0.71428
    };

    // Default storage utilization (used when pool-specific not configured)
    const defaultStorageUtilization = this.config.storageTargetUtilization ?? this.config.targetUtilization;

    // Step 1: Filter storage pools based on selected cluster
    // When a specific compute cluster is selected, only include storage pools
    // that target storage clusters linked to that compute cluster
    let filteredPools = storagePools;

    if (this.selectedClusterId && this.selectedClusterId !== 'all') {
      // Find storage clusters that are linked to the selected compute cluster
      const linkedStorageClusterIds = storageClusters
        .filter(sc => sc.type === 'hyperConverged' && sc.computeClusterId === this.selectedClusterId)
        .map(sc => sc.id);

      // Filter pools to only those targeting linked storage clusters
      filteredPools = storagePools.filter(pool =>
        pool.storageClusterId && linkedStorageClusterIds.includes(pool.storageClusterId)
      );

      console.log('[PricingModelService] Storage pool filtering:', {
        selectedClusterId: this.selectedClusterId,
        linkedStorageClusterIds,
        originalPoolCount: storagePools.length,
        filteredPoolCount: filteredPools.length
      });
    }

    // Step 2: Calculate raw capacity per physical storage cluster
    // This is needed to properly handle shared capacity across pools
    const physicalClusterRawCapacity = new Map<string, { rawTiB: number; rawTB: number; name: string }>();

    storageClusters.forEach(sc => {
      let clusterNodes: InfrastructureComponent[] = [];

      if (sc.type === 'hyperConverged' && sc.computeClusterId) {
        clusterNodes = designComponents.filter(
          component => component.role === 'hyperConvergedNode' &&
          component.clusterInfo?.clusterId === sc.computeClusterId
        );
      } else {
        clusterNodes = designComponents.filter(
          component => component.role === 'storageNode' &&
          component.clusterInfo?.clusterId === sc.id
        );
      }

      let totalRawTB = 0;
      clusterNodes.forEach(node => {
        const quantity = node.quantity || 1;
        if ('attachedDisks' in node && node.attachedDisks) {
          const disks = node.attachedDisks || [];
          disks.forEach((disk: { capacityTB?: number; quantity?: number; storageClusterId?: string }) => {
            if (disk && 'capacityTB' in disk) {
              if (sc.type === 'hyperConverged') {
                // For HCI, only count disks tagged for this storage cluster
                if ('storageClusterId' in disk && disk.storageClusterId === sc.id) {
                  const diskQuantity = disk.quantity || 1;
                  totalRawTB += (disk.capacityTB || 0) * diskQuantity * quantity;
                }
              } else {
                const diskQuantity = disk.quantity || 1;
                totalRawTB += (disk.capacityTB || 0) * diskQuantity * quantity;
              }
            }
          });
        }
      });

      physicalClusterRawCapacity.set(sc.id, {
        rawTB: totalRawTB,
        rawTiB: totalRawTB * TB_TO_TIB,
        name: sc.name
      });
    });

    // Step 3: Calculate initial pool metrics
    interface PoolMetrics {
      pool: typeof filteredPools[0];
      targetCluster: typeof storageClusters[0] | undefined;
      poolEfficiencyFactor: number;
      maxFillFactor: number;
      totalRawCapacityTB: number;
      totalRawCapacityTiB: number;
      usableCapacityTB: number;
      usableCapacityTiB: number;
      effectiveCapacityTiB: number;
      totalCost: number;
    }

    const poolMetrics: PoolMetrics[] = filteredPools.map(pool => {
      const targetCluster = storageClusters.find(sc => sc.id === pool.storageClusterId);

      let clusterNodes: InfrastructureComponent[] = [];
      if (targetCluster?.type === 'hyperConverged' && targetCluster.computeClusterId) {
        clusterNodes = designComponents.filter(
          component => component.role === 'hyperConvergedNode' &&
          component.clusterInfo?.clusterId === targetCluster.computeClusterId
        );
      } else if (targetCluster) {
        clusterNodes = designComponents.filter(
          component => component.role === 'storageNode' &&
          component.clusterInfo?.clusterId === targetCluster.id
        );
      }

      let totalRawCapacityTB = 0;
      let totalCost = 0;

      clusterNodes.forEach(node => {
        const quantity = node.quantity || 1;
        const nodeCost = (node.cost || 0) * quantity;

        if ('attachedDisks' in node && node.attachedDisks) {
          const disks = node.attachedDisks || [];
          let diskCostForNode = 0;

          disks.forEach((disk: { capacityTB?: number; quantity?: number; cost?: number; storageClusterId?: string }) => {
            if (disk && 'capacityTB' in disk) {
              if (targetCluster?.type === 'hyperConverged') {
                if ('storageClusterId' in disk && disk.storageClusterId === targetCluster.id) {
                  const diskQuantity = disk.quantity || 1;
                  totalRawCapacityTB += (disk.capacityTB || 0) * diskQuantity * quantity;
                  diskCostForNode += (disk.cost || 0) * diskQuantity * quantity;
                }
              } else {
                const diskQuantity = disk.quantity || 1;
                totalRawCapacityTB += (disk.capacityTB || 0) * diskQuantity * quantity;
                diskCostForNode += (disk.cost || 0) * diskQuantity * quantity;
              }
            }
          });

          if (targetCluster?.type === 'hyperConverged') {
            totalCost += diskCostForNode;
          } else {
            totalCost += nodeCost;
          }
        }
      });

      const poolEfficiencyFactor = poolEfficiencyFactors[pool.poolType || '3 Replica'] || 0.33333;
      const maxFillFactor = (pool.maxFillFactor || 80) / 100;

      const totalRawCapacityTiB = totalRawCapacityTB * TB_TO_TIB;
      const usableCapacityTB = totalRawCapacityTB * poolEfficiencyFactor;
      const usableCapacityTiB = usableCapacityTB * TB_TO_TIB;
      const effectiveCapacityTiB = usableCapacityTiB * maxFillFactor;

      return {
        pool,
        targetCluster,
        poolEfficiencyFactor,
        maxFillFactor,
        totalRawCapacityTB,
        totalRawCapacityTiB,
        usableCapacityTB,
        usableCapacityTiB,
        effectiveCapacityTiB,
        totalCost
      };
    });

    // Step 4: Group pools by physical storage cluster for shared capacity tracking
    const poolsByPhysicalCluster = new Map<string, PoolMetrics[]>();

    poolMetrics.forEach(pm => {
      const physicalClusterId = pm.targetCluster?.id || 'unknown';
      if (!poolsByPhysicalCluster.has(physicalClusterId)) {
        poolsByPhysicalCluster.set(physicalClusterId, []);
      }
      poolsByPhysicalCluster.get(physicalClusterId)!.push(pm);
    });

    // Step 5: Build final results with shared capacity validation
    return poolMetrics.map(pm => {
      const physicalClusterId = pm.targetCluster?.id || 'unknown';
      const physicalCapacity = physicalClusterRawCapacity.get(physicalClusterId);
      const siblingsOnSameCluster = poolsByPhysicalCluster.get(physicalClusterId) || [];

      // Get per-pool utilization from config, or use default
      const poolConfig = this.config.storagePoolConfigs?.find(
        p => p.poolId === pm.pool.id || p.poolName === pm.pool.name
      );
      const poolTargetUtilization = poolConfig?.targetUtilization ?? defaultStorageUtilization;

      // Calculate this pool's sellable capacity at its target utilization
      const sellableCapacityTiB = pm.effectiveCapacityTiB * poolTargetUtilization;
      const sellableCapacityGB = sellableCapacityTiB * TIB_TO_GB;

      // Calculate raw consumption for this pool
      const rawConsumptionTiB = sellableCapacityTiB / pm.poolEfficiencyFactor / pm.maxFillFactor;

      // Calculate consumption by OTHER pools on the same physical cluster
      let otherPoolsConsumptionTiB = 0;
      siblingsOnSameCluster.forEach(sibling => {
        if (sibling.pool.id !== pm.pool.id) {
          const siblingConfig = this.config.storagePoolConfigs?.find(
            p => p.poolId === sibling.pool.id || p.poolName === sibling.pool.name
          );
          const siblingUtilization = siblingConfig?.targetUtilization ?? defaultStorageUtilization;
          const siblingSellable = sibling.effectiveCapacityTiB * siblingUtilization;
          const siblingRawConsumption = siblingSellable / sibling.poolEfficiencyFactor / sibling.maxFillFactor;
          otherPoolsConsumptionTiB += siblingRawConsumption;
        }
      });

      // Calculate total consumption across all pools on this physical cluster
      const totalPhysicalConsumptionTiB = rawConsumptionTiB + otherPoolsConsumptionTiB;

      // Calculate max available utilization for this pool given other pools' consumption
      const availableRawForThisPool = (physicalCapacity?.rawTiB || pm.totalRawCapacityTiB) - otherPoolsConsumptionTiB;
      // Max sellable = available raw * efficiency * maxFill
      const maxSellableForThisPool = Math.max(0, availableRawForThisPool * pm.poolEfficiencyFactor * pm.maxFillFactor);
      // Max utilization = maxSellable / effectiveCapacity (capped at 1.0)
      const maxAvailableUtilization = pm.effectiveCapacityTiB > 0
        ? Math.min(1.0, maxSellableForThisPool / pm.effectiveCapacityTiB)
        : 0;

      // Check if configuration exceeds physical capacity
      const capacityError = totalPhysicalConsumptionTiB > (physicalCapacity?.rawTiB || pm.totalRawCapacityTiB);

      if (capacityError) {
        console.log('[PricingModelService] Capacity error detected:', {
          poolId: pm.pool.id,
          poolName: pm.pool.name,
          physicalClusterId,
          physicalClusterName: physicalCapacity?.name,
          physicalRawTiB: physicalCapacity?.rawTiB,
          totalConsumptionTiB: totalPhysicalConsumptionTiB,
          thisPoolConsumptionTiB: rawConsumptionTiB,
          otherPoolsConsumptionTiB,
          maxAvailableUtilization
        });
      }

      // Calculate cost metrics
      const costPerUsableTiB = pm.usableCapacityTiB > 0 ? pm.totalCost / pm.usableCapacityTiB : 0;

      // Get per-pool price or use default
      const pricePerGBMonth = poolConfig?.fixedPricePerGBMonth ?? this.config.fixedStoragePrice ?? 0.036;

      // Calculate monthly revenue (even if over capacity, to show what would be earned)
      const monthlyRevenue = sellableCapacityGB * pricePerGBMonth;

      return {
        id: pm.pool.id,
        name: pm.pool.name,
        poolType: pm.pool.poolType || '3 Replica',
        isHyperConverged: pm.targetCluster?.type === 'hyperConverged' || false,
        physicalClusterId,
        physicalClusterName: physicalCapacity?.name || 'Unknown',
        totalRawCapacityTB: pm.totalRawCapacityTB,
        totalRawCapacityTiB: pm.totalRawCapacityTiB,
        physicalClusterRawTiB: physicalCapacity?.rawTiB || pm.totalRawCapacityTiB,
        poolEfficiencyFactor: pm.poolEfficiencyFactor,
        usableCapacityTB: pm.usableCapacityTB,
        usableCapacityTiB: pm.usableCapacityTiB,
        maxFillFactor: pm.maxFillFactor,
        effectiveCapacityTiB: pm.effectiveCapacityTiB,
        targetUtilization: poolTargetUtilization,
        rawConsumptionTiB,
        sellableCapacityTiB,
        sellableCapacityGB,
        maxAvailableUtilization,
        capacityError,
        totalPhysicalConsumptionTiB,
        otherPoolsConsumptionTiB,
        totalCost: pm.totalCost,
        costPerUsableTiB,
        pricePerGBMonth,
        monthlyRevenue
      };
    });
  }

  public calculateClusterCapacity(): ClusterCapacity {
    // Get components based on selected cluster or all compute components
    const computeComponents = this.getClusterComponents();

    if (computeComponents.length === 0) {
      return {
        totalPhysicalCores: 0,
        totalPhysicalMemoryGB: 0,
        totalPhysicalNodes: 0,
        totalvCPUs: 0,
        totalMemoryGB: 0,
        usablevCPUs: 0,
        usableMemoryGB: 0,
        sellingvCPUs: 0,
        sellingMemoryGB: 0,
        haReservation: 0,
        virtualizationOverhead: this.config.virtualizationOverhead,
        targetUtilization: this.config.targetUtilization,
        isHyperConverged: false
      };
    }

    // Already filtered in getClusterComponents()

    let totalPhysicalCores = 0;
    let totalPhysicalMemoryGB = 0;
    let totalPhysicalNodes = 0;
    let totalDisksInCluster = 0;
    let isHyperConverged = false;

    computeComponents.forEach(comp => {
      const qty = comp.quantity || 1;
      const component = comp.component;
      totalPhysicalNodes += qty;  // Count the actual nodes

      // Check if this is a hyper-converged node
      if (comp.metadata?.role === 'hyperConvergedNode') {
        isHyperConverged = true;
      }

      // Get cores - check for socket-based calculation first
      let cores = 0;
      if (component.cpuSockets && component.cpuCoresPerSocket) {
        cores = component.cpuSockets * component.cpuCoresPerSocket;
      } else if (component.specifications?.cpu?.cores) {
        cores = component.specifications.cpu.cores;
      } else if (component.cpu?.cores) {
        cores = component.cpu.cores;
      } else if (component.cpuCores) {
        cores = component.cpuCores;
      } else if (component.coreCount) {
        cores = component.coreCount;
      } else if (component.cores) {
        cores = component.cores;
      } else if (component.totalCores) {
        cores = component.totalCores;
      }

      // Get memory
      const memory = component.memoryCapacity ||
                    component.specifications?.memory?.capacity ||
                    component.memory?.capacity ||
                    component.memoryGB || 0;

      totalPhysicalCores += cores * qty;
      totalPhysicalMemoryGB += memory * qty;
    });

    // Count disks for hyper-converged clusters from actual design components
    if (isHyperConverged && this.design?.components) {
      const designComponents = this.design.components as InfrastructureComponent[];

      // Filter to hyper-converged nodes in the selected cluster(s)
      const hyperConvergedNodes = designComponents.filter(c => {
        if (c.role !== 'hyperConvergedNode') return false;

        // If a specific cluster is selected, filter to that cluster
        if (this.selectedClusterId && this.selectedClusterId !== 'all') {
          const componentClusterId = c.clusterInfo?.clusterId;
          return componentClusterId === this.selectedClusterId;
        }

        return true;
      });

      hyperConvergedNodes.forEach(node => {
        if ('attachedDisks' in node && node.attachedDisks) {
          const disks = node.attachedDisks || [];
          const nodeQty = node.quantity || 1;
          disks.forEach((disk) => {
            if (disk && typeof disk === 'object' && 'quantity' in disk) {
              const diskQty = (disk as { quantity?: number }).quantity || 1;
              totalDisksInCluster += diskQty * nodeQty;
            }
          });
        }
      });

      console.log('[PricingModelService] Disk counting:', {
        isHyperConverged,
        hyperConvergedNodesFound: hyperConvergedNodes.length,
        totalDisksInCluster,
        selectedClusterId: this.selectedClusterId
      });
    }

    // Calculate storage overhead for hyper-converged clusters
    let cpuCoresPerDisk = 4; // default
    let memoryGBPerDisk = 2; // default
    let storageOverheadCores = 0;
    let storageOverheadMemoryGB = 0;

    if (isHyperConverged && totalDisksInCluster > 0) {
      // Find storage cluster configuration(s) for hyper-converged clusters
      const storageClusters = this.design?.requirements?.storageRequirements?.storageClusters?.filter(
        sc => sc.type === 'hyperConverged'
      ) || [];

      if (this.selectedClusterId && this.selectedClusterId !== 'all') {
        // For a specific cluster, find its storage configuration
        const clusterConfig = this.design?.requirements?.computeRequirements?.computeClusters?.find(
          cluster => cluster.id === this.selectedClusterId || cluster.name === this.selectedClusterId
        );

        if (clusterConfig) {
          const storageCluster = storageClusters.find(
            sc => sc.computeClusterId === clusterConfig.id
          );

          if (storageCluster) {
            cpuCoresPerDisk = storageCluster.cpuCoresPerDisk ?? 4;
            memoryGBPerDisk = storageCluster.memoryGBPerDisk ?? 2;
          }
        }
      } else {
        // For "all clusters", calculate weighted average based on cluster sizes
        if (storageClusters.length > 0) {
          let totalCpuCores = 0;
          let totalMemoryGB = 0;
          let totalClusters = 0;

          storageClusters.forEach(sc => {
            totalCpuCores += sc.cpuCoresPerDisk ?? 4;
            totalMemoryGB += sc.memoryGBPerDisk ?? 2;
            totalClusters++;
          });

          if (totalClusters > 0) {
            cpuCoresPerDisk = totalCpuCores / totalClusters;
            memoryGBPerDisk = totalMemoryGB / totalClusters;
          }
        }
      }

      // Calculate total storage overhead
      storageOverheadCores = totalDisksInCluster * cpuCoresPerDisk;
      storageOverheadMemoryGB = totalDisksInCluster * memoryGBPerDisk;

      console.log('[PricingModelService] Storage overhead calculated:', {
        isHyperConverged,
        totalDisksInCluster,
        cpuCoresPerDisk,
        memoryGBPerDisk,
        storageOverheadCores,
        storageOverheadMemoryGB,
        selectedClusterId: this.selectedClusterId
      });
    }

    // Subtract storage overhead from total capacity BEFORE applying other factors
    const computeAvailableCores = totalPhysicalCores - storageOverheadCores;
    const computeAvailableMemoryGB = totalPhysicalMemoryGB - storageOverheadMemoryGB;

    // Apply oversubscription ratios from requirements
    // First check if a specific cluster is selected and get its overcommit ratio
    let cpuOversubscription = 4; // Default
    let memoryOversubscription = 1; // Default

    if (this.selectedClusterId && this.selectedClusterId !== 'all') {
      // Find the specific cluster configuration
      const clusterConfig = this.design?.requirements?.computeRequirements?.computeClusters?.find(
        cluster => cluster.id === this.selectedClusterId || cluster.name === this.selectedClusterId
      );

      if (clusterConfig?.overcommitRatio) {
        cpuOversubscription = clusterConfig.overcommitRatio;
      }
    }

    // Fall back to global compute requirements if no cluster-specific ratio
    if (!this.selectedClusterId || this.selectedClusterId === 'all') {
      // Use the highest overcommit ratio from all clusters when analyzing all
      const clusters = this.design?.requirements?.computeRequirements?.computeClusters || [];
      if (clusters.length > 0) {
        cpuOversubscription = Math.max(...clusters.map(c => c.overcommitRatio || 4));
      }
    }

    // Check for memory overcommit ratio in global requirements
    memoryOversubscription = this.design?.requirements?.compute?.memory?.oversubscriptionRatio ||
                            this.design?.requirements?.computeRequirements?.memory?.oversubscriptionRatio || 1;

    const totalvCPUs = computeAvailableCores * cpuOversubscription;
    const totalMemoryGB = computeAvailableMemoryGB * memoryOversubscription;

    // Calculate HA reservation based on failure tolerance
    const haReservation = this.calculateHAReservation(computeComponents);

    // Apply virtualization overhead
    let usablevCPUs: number;
    let usableMemoryGB: number;
    
    if (this.config.virtualizationOverheadType === 'fixed') {
      // Fixed overhead - subtract fixed amounts
      const cpuOverhead = this.config.virtualizationOverhead; // Fixed vCPUs
      const memoryOverhead = this.config.virtualizationOverheadMemory || this.config.virtualizationOverhead; // Fixed GB
      
      usablevCPUs = Math.max(0, totalvCPUs - cpuOverhead) * (1 - haReservation);
      usableMemoryGB = Math.max(0, totalMemoryGB - memoryOverhead) * (1 - haReservation);
    } else {
      // Percentage overhead
      const afterVirtualization = 1 - this.config.virtualizationOverhead;
      usablevCPUs = totalvCPUs * afterVirtualization * (1 - haReservation);
      usableMemoryGB = totalMemoryGB * afterVirtualization * (1 - haReservation);
    }

    const sellingvCPUs = usablevCPUs * this.config.targetUtilization;
    const sellingMemoryGB = usableMemoryGB * this.config.targetUtilization;

    const result = {
      totalPhysicalCores,
      totalPhysicalMemoryGB,
      totalPhysicalNodes,
      totalvCPUs,
      totalMemoryGB,
      usablevCPUs,
      usableMemoryGB,
      sellingvCPUs,
      sellingMemoryGB,
      haReservation,
      virtualizationOverhead: this.config.virtualizationOverhead,
      targetUtilization: this.config.targetUtilization,
      isHyperConverged,
      storageOverheadCores: isHyperConverged ? storageOverheadCores : undefined,
      storageOverheadMemoryGB: isHyperConverged ? storageOverheadMemoryGB : undefined,
      totalDisksInCluster: isHyperConverged ? totalDisksInCluster : undefined,
      cpuCoresPerDisk: isHyperConverged ? cpuCoresPerDisk : undefined,
      memoryGBPerDisk: isHyperConverged ? memoryGBPerDisk : undefined
    };

    console.log('[PricingModelService] ClusterCapacity result:', {
      isHyperConverged: result.isHyperConverged,
      storageOverheadCores: result.storageOverheadCores,
      storageOverheadMemoryGB: result.storageOverheadMemoryGB,
      totalDisksInCluster: result.totalDisksInCluster,
      cpuCoresPerDisk: result.cpuCoresPerDisk,
      memoryGBPerDisk: result.memoryGBPerDisk
    });

    return result;
  }

  private calculateHAReservation(computeComponents: PlacedComponent[]): number {
    if (!computeComponents || computeComponents.length === 0) {
      return 0;
    }
    
    const totalHosts = computeComponents.reduce((sum, comp) => sum + (comp.quantity || 1), 0);
    if (totalHosts === 0) return 0;

    // Get the actual number of availability zones from requirements
    const physicalAZs = this.design?.requirements?.physicalConstraints?.availabilityZones || [];
    const numAZs = physicalAZs.length || this.design?.requirements?.physicalConstraints?.totalAvailabilityZones || 1;
    
    // Get the cluster-specific AZ redundancy setting if a cluster is selected
    let azFailuresToTolerate = 0;
    
    if (this.selectedClusterId && this.selectedClusterId !== 'all') {
      // Find the cluster configuration to get its AZ redundancy setting
      const clusterConfig = this.design?.requirements?.computeRequirements?.computeClusters?.find(
        cluster => cluster.id === this.selectedClusterId || cluster.name === this.selectedClusterId
      );
      
      if (clusterConfig?.availabilityZoneRedundancy) {
        // Parse redundancy setting: 'N+0', 'N+1', 'N+2' etc.
        const redundancyMatch = clusterConfig.availabilityZoneRedundancy.match(/N\+(\d+)/);
        if (redundancyMatch) {
          azFailuresToTolerate = parseInt(redundancyMatch[1], 10);
        } else if (clusterConfig.availabilityZoneRedundancy === '1 Node' || 
                   clusterConfig.availabilityZoneRedundancy === '2 Nodes') {
          // For node-level redundancy, we don't tolerate AZ failures
          // The redundancy is at the individual node level
          azFailuresToTolerate = 0;
        }
      }
    } else {
      // When analyzing all clusters, use the maximum redundancy requirement
      const clusters = this.design?.requirements?.computeRequirements?.computeClusters || [];
      clusters.forEach(cluster => {
        if (cluster.availabilityZoneRedundancy) {
          const redundancyMatch = cluster.availabilityZoneRedundancy.match(/N\+(\d+)/);
          if (redundancyMatch) {
            const failures = parseInt(redundancyMatch[1], 10);
            azFailuresToTolerate = Math.max(azFailuresToTolerate, failures);
          } else if (cluster.availabilityZoneRedundancy === '1 Node' || 
                     cluster.availabilityZoneRedundancy === '2 Nodes') {
            // For node-level redundancy, we don't tolerate AZ failures
            // The redundancy is handled at the node level in calculations
            // azFailuresToTolerate remains unchanged
          }
        }
      });
    }

    // Calculate hosts per zone (assuming even distribution)
    const hostsPerZone = Math.ceil(totalHosts / numAZs);
    
    // Always add 1 additional node for host-level redundancy
    const additionalNodes = 1;
    
    // Calculate total reserved capacity:
    // - Nodes to tolerate AZ failures (azFailuresToTolerate * hostsPerZone)
    // - Plus additional node(s) for host-level redundancy
    const reservedHosts = (azFailuresToTolerate * hostsPerZone) + additionalNodes;
    
    // Calculate reservation percentage
    const reservation = reservedHosts / totalHosts;
    
    // Cap at 50% reservation for safety
    return Math.min(0.5, reservation);
  }

  public getClusterComponents(): PlacedComponent[] {
    if (!this.design || !this.design.componentRoles) return [];

    const components: PlacedComponent[] = [];
    
    this.design.componentRoles.forEach(role => {
      if (!role.assignedComponentId) return;
      
      // Check if this is a compute-related role
      const isComputeRole = 
        role.role === 'computeNode' || 
        role.role === 'hyperConvergedNode' || 
        role.role === 'gpuNode';
      
      if (!isComputeRole) return;
      
      // If a specific cluster is selected, filter to that cluster
      if (this.selectedClusterId) {
        const roleClusterId = role.clusterInfo?.clusterId || role.role;
        if (roleClusterId !== this.selectedClusterId) return;
      }
      
      const component = this.componentTemplates.find(
        (c) => c.id === role.assignedComponentId
      );
        
      if (component) {
        components.push({
          id: role.id,
          component,
          quantity: role.adjustedRequiredCount || role.requiredCount || 1,
          metadata: {
            cluster_id: role.clusterInfo?.clusterId || role.role,
            cluster_name: role.clusterInfo?.clusterName || role.role,
            role: role.role
          }
        });
      }
    });

    console.log('[PricingModelService] Cluster components:', components);
    return components;
  }

  private calculateInfrastructureCosts(): {
    totalCapitalCost: number;
    totalOperationalCost: number;
    totalMonthlyCost: number;
    networkCostPerAZ: Map<string, number>;
  } {
    // If external operational costs are provided, use them
    if (this.externalOperationalCosts && this.externalOperationalCosts.totalMonthly > 0) {
      console.log('[PricingModelService] Using external operational costs:', this.externalOperationalCosts.totalMonthly);
      return {
        totalCapitalCost: 0, // Not used when external costs provided
        totalOperationalCost: 0, // Not used when external costs provided
        totalMonthlyCost: this.externalOperationalCosts.totalMonthly,
        networkCostPerAZ: new Map<string, number>()
      };
    }

    // Otherwise calculate from components
    let totalCapitalCost = 0;
    let totalOperationalCost = 0;
    const networkCostPerAZ = new Map<string, number>();

    // Get all components (not just compute)
    const allComponents = this.getAllComponents();
    
    if (allComponents.length === 0) {
      return {
        totalCapitalCost: 0,
        totalOperationalCost: 0,
        totalMonthlyCost: 0,
        networkCostPerAZ
      };
    }

    // Calculate costs for all components
    console.log('[PricingModelService] Calculating costs from components:', allComponents.length);
    
    allComponents.forEach(comp => {
      const qty = comp.quantity || 1;
      // Try different cost fields
      const capex = (comp.component.pricing?.basePrice || 
                     comp.component.cost || 
                     comp.component.basePrice || 0) * qty;
      const opex = (comp.component.pricing?.yearlyOperationalCost || 
                    comp.component.yearlyOperationalCost || 0) * qty;
      
      if (capex > 0 || opex > 0) {
        console.log('[PricingModelService] Component cost:', {
          name: comp.component.name,
          qty,
          capex,
          opex,
          component: comp.component
        });
      }
      
      totalCapitalCost += capex;
      totalOperationalCost += opex;

      // Track network costs per AZ
      if ((comp.component.type as string) === 'network') {
        const az = comp.metadata?.availability_zone || 'default';
        const currentCost = networkCostPerAZ.get(az) || 0;
        networkCostPerAZ.set(az, currentCost + capex + (opex / 12));
      }
    });

    // Amortize capital over 5 years
    const monthlyCapital = totalCapitalCost / 60;
    const monthlyOperational = totalOperationalCost / 12;
    const totalMonthlyCost = monthlyCapital + monthlyOperational;

    console.log('[PricingModelService] Infrastructure costs from components:', {
      totalCapitalCost,
      totalOperationalCost,
      monthlyCapital,
      monthlyOperational,
      totalMonthlyCost
    });

    return {
      totalCapitalCost,
      totalOperationalCost,
      totalMonthlyCost,
      networkCostPerAZ
    };
  }

  private calculateCpuMemoryWeightRatio(capacity: ClusterCapacity): number {
    // Calculate the natural ratio of vCPU to memory
    // If we have 384 vCPUs and 1152 GB RAM, the ratio is 1:3
    // This means 1 vCPU "costs" as much as 3 GB of RAM
    if (capacity.totalMemoryGB === 0 || capacity.totalvCPUs === 0) return 1;
    
    return capacity.totalMemoryGB / capacity.totalvCPUs;
  }

  private calculateBaseCosts(
    infrastructureCosts: ReturnType<typeof this.calculateInfrastructureCosts>,
    capacity: ClusterCapacity,
    cpuMemoryRatio: number
  ): { cpuCost: number; memoryCost: number; storageCost: number } {
    const hoursPerMonth = 730; // Average hours per month

    if (this.config.operatingModel === 'fixedPrice') {
      // Convert storage price from $/GB/month to $/GB/hour
      const storageMonthlyPrice = this.config.fixedStoragePrice || 0.036;
      const storageCostPerGBHour = storageMonthlyPrice / hoursPerMonth;

      return {
        cpuCost: this.config.fixedCpuPrice || 0.01,
        memoryCost: this.config.fixedMemoryPrice || 0.003,
        storageCost: storageCostPerGBHour
      };
    }

    // Cost plus model - calculate from infrastructure
    const totalMonthlyCost = infrastructureCosts.totalMonthlyCost;
    
    // Network costs distributed per host
    const computeComponents = this.getClusterComponents();
    const totalHosts = computeComponents.reduce((sum, comp) => sum + (comp.quantity || 1), 0);
    
    // Calculate storage capacity from hyper-converged nodes
    let totalStorageTB = 0;
    computeComponents.forEach(comp => {
      const component = comp.component;
      const qty = comp.quantity || 1;
      
      // Check if this is a hyper-converged node with storage
      if (comp.metadata?.role === 'hyperConvergedNode') {
        // Look for storage capacity in various fields
        const storageCapacityGB = 
          component.storageCapacity || 
          component.specifications?.storage?.capacity || 
          component.storage?.capacity || 
          0;
        
        if (storageCapacityGB > 0) {
          totalStorageTB += (storageCapacityGB * qty) / 1024; // Convert GB to TB
        }
      }
    });
    
    // Allocate costs between CPU, memory, and storage
    // Estimate storage represents about 10-15% of total infrastructure cost for hyper-converged
    const storageAllocationRatio = totalStorageTB > 0 ? 0.15 : 0; // 15% for storage if present
    const computeAllocationRatio = 1 - storageAllocationRatio; // 85% for compute/memory
    
    // Compute and memory cost allocation
    const computeMonthlyCost = totalMonthlyCost * computeAllocationRatio;
    const storageMonthlyCost = totalMonthlyCost * storageAllocationRatio;
    
    // Allocate compute costs between CPU and memory based on their ratio
    // Total units = vCPUs + (Memory / ratio)
    const totalWeightedUnits = capacity.sellingvCPUs + (capacity.sellingMemoryGB / cpuMemoryRatio);
    
    if (totalWeightedUnits === 0) {
      return { cpuCost: 0, memoryCost: 0, storageCost: 0 };
    }

    const costPerWeightedUnit = computeMonthlyCost / totalWeightedUnits / hoursPerMonth;
    
    // Calculate storage cost per GB per hour
    let storageCostPerGBHour = 0;
    if (totalStorageTB > 0) {
      // Calculate sellable storage (applying same utilization factor as compute)
      const sellableStorageTB = totalStorageTB * this.config.targetUtilization;
      const sellableStorageGB = sellableStorageTB * 1024;
      storageCostPerGBHour = storageMonthlyCost / sellableStorageGB / hoursPerMonth;
    } else {
      // Default storage cost if no storage infrastructure (convert from monthly to hourly)
      const defaultStorageMonthly = 0.036; // $0.036/GB/month
      storageCostPerGBHour = defaultStorageMonthly / hoursPerMonth;
    }
    
    // Apply profit margin for cost plus model
    const margin = this.config.profitMargin;
    
    const result = {
      cpuCost: costPerWeightedUnit * margin,
      memoryCost: (costPerWeightedUnit / cpuMemoryRatio) * margin,
      storageCost: storageCostPerGBHour * margin // Now properly calculated per GB per hour
    };
    
    console.log('[PricingModelService] Base costs calculated:', {
      totalMonthlyCost,
      computeMonthlyCost,
      sellableCPUs: capacity.sellingvCPUs,
      sellableMemory: capacity.sellingMemoryGB,
      totalWeightedUnits,
      costPerWeightedUnit,
      margin,
      result,
      expectedRevenue: (capacity.sellingvCPUs * result.cpuCost + capacity.sellingMemoryGB * result.memoryCost) * hoursPerMonth
    });
    
    return result;
  }

  private calculateEffectiveMargin(
    baseCosts: { cpuCost: number; memoryCost: number },
    infrastructureCosts: ReturnType<typeof this.calculateInfrastructureCosts>
  ): number {
    if (this.config.operatingModel === 'costPlus') {
      return this.config.profitMargin - 1; // Return as percentage
    }

    // For fixed price, calculate what the margin would be
    const capacity = this.calculateClusterCapacity();
    const hoursPerMonth = 730;
    
    const monthlyRevenue = 
      (capacity.sellingvCPUs * baseCosts.cpuCost * hoursPerMonth) +
      (capacity.sellingMemoryGB * baseCosts.memoryCost * hoursPerMonth);
    
    const monthlyCost = infrastructureCosts.totalMonthlyCost;
    
    if (monthlyCost === 0) return 0;
    
    return (monthlyRevenue - monthlyCost) / monthlyCost;
  }

  private calculateRatioPenalty(vCPUs: number, memoryGB: number): number {
    // Calculate the natural ratio of the cluster
    const capacity = this.calculateClusterCapacity();
    
    // Handle edge cases
    if (capacity.totalMemoryGB === 0 || capacity.totalvCPUs === 0) {
      return 1; // No premium if we can't calculate ratio
    }
    
    const naturalRatio = capacity.totalvCPUs / capacity.totalMemoryGB; // e.g., 0.25 for 1:4 ratio
    
    // Calculate the VM's ratio
    const vmRatio = vCPUs / memoryGB;
    
    // Calculate deviation from natural ratio
    // Use log scale to handle both over and under ratios equally
    const logNaturalRatio = Math.log2(naturalRatio);
    const logVmRatio = Math.log2(vmRatio);
    const ratioDeviation = Math.abs(logVmRatio - logNaturalRatio);
    
    // Apply configurable curve for ratio penalty
    const exponent = this.config.ratioPenaltyExponent || 2; // Default to quadratic
    
    // Calculate premium based on deviation with configurable curve
    // No premium when ratio matches (deviation = 0)
    // Premium increases based on configured exponent
    const premium = Math.pow(ratioDeviation, exponent) * this.config.sizePenaltyFactor;
    
    return 1 + premium; // Return as multiplier (1 = no premium)
  }

  private calculateVMSizePenalty(vCPUs: number, memoryGB: number): number {
    // Apply premium for large VMs due to scheduling challenges
    // Premium increases with VM size using configurable curve
    const vmSizeFactor = this.config.vmSizePenaltyFactor || 0.3; // Base premium factor
    const curveExponent = this.config.vmSizeCurveExponent || 2; // Default quadratic curve
    const sizeThreshold = this.config.vmSizeThreshold || 4; // Start applying at 4 vCPUs
    const acceleration = this.config.vmSizeAcceleration || 0.5; // How quickly premium accelerates
    
    // Use the larger dimension (CPU or memory) for size calculation
    const effectiveSize = Math.max(vCPUs, memoryGB / 4); // Normalize memory to CPU scale (4GB = 1 vCPU)
    
    // No premium below threshold
    if (effectiveSize <= sizeThreshold) {
      return 1;
    }
    
    // Calculate how far above threshold we are
    const sizeAboveThreshold = effectiveSize - sizeThreshold;
    const maxExpectedSize = 64 - sizeThreshold; // Assume 64 vCPU max
    const normalizedSize = Math.min(sizeAboveThreshold / maxExpectedSize, 1);
    
    // Apply curve shaping with configurable exponent
    // Higher exponent = more aggressive curve at larger sizes
    const curvedSize = Math.pow(normalizedSize, curveExponent);
    
    // Calculate premium with acceleration factor
    // Acceleration controls how the premium grows: 
    // - 0 = linear growth
    // - 0.5 = moderate exponential 
    // - 1 = aggressive exponential
    const basePremium = curvedSize * vmSizeFactor;
    const acceleratedPremium = basePremium * (1 + acceleration * curvedSize);
    
    // For very large VMs, add an additional exponential component
    let finalPremium = acceleratedPremium;
    if (effectiveSize > 32) {
      const extremeSizeRatio = (effectiveSize - 32) / 32;
      finalPremium += Math.exp(extremeSizeRatio * acceleration) - 1;
    }
    
    return 1 + finalPremium; // Return as multiplier (1 = no premium)
  }

  calculateVMPrice(vCPUs: number, memoryGB: number, storageGB: number = 0): VMPricing {
    const capacity = this.calculateClusterCapacity();
    const infrastructureCosts = this.calculateInfrastructureCosts();
    const cpuMemoryRatio = this.calculateCpuMemoryWeightRatio(capacity);
    const baseCosts = this.calculateBaseCosts(infrastructureCosts, capacity, cpuMemoryRatio);

    // Calculate licensing cost per vCPU per hour
    // Use external costs if provided, otherwise calculate from infrastructure
    const hoursPerMonth = 730;
    let licensingCostPerVCPUHour = 0;

    if (this.externalOperationalCosts?.licensingMonthly) {
      const licensingMonthly = this.externalOperationalCosts.licensingMonthly;
      if (licensingMonthly > 0 && capacity.sellingvCPUs > 0) {
        // Allocate licensing cost per vCPU
        licensingCostPerVCPUHour = licensingMonthly / capacity.sellingvCPUs / hoursPerMonth;
      }
    }

    // Calculate natural ratio for the infrastructure
    const naturalRatio = capacity.totalMemoryGB / capacity.totalvCPUs; // e.g., 4 for 1:4 ratio
    
    // MONOTONIC PRICING MODEL WITH IMPROVED RATIO HANDLING
    // Guarantees that P(c1, m1) <= P(c2, m2) when c1 <= c2 and m1 <= m2
    
    // Step 1: Calculate base linear costs
    const baseLinearCpuCost = baseCosts.cpuCost * vCPUs;
    const baseLinearMemCost = baseCosts.memoryCost * memoryGB;
    const baseStorageCost = baseCosts.storageCost * storageGB; // Storage cost is now per GB per hour
    
    // Step 2: Calculate ratio deviation and impact
    const vmRatio = memoryGB / vCPUs;
    const logRatioDeviation = Math.log2(vmRatio / naturalRatio);
    const absRatioDeviation = Math.abs(logRatioDeviation);
    
    // Improved ratio impact calculation:
    // - Uses configured exponent to control curve shape
    // - Smoother near natural ratio (lower exponent = smoother)
    // - Always increases at extremes (no dropoff)
    const ratioExponent = this.config.ratioPenaltyExponent || 2;
    const normalizedDeviation = Math.min(absRatioDeviation / 3, 1); // Normalize to [0,1] over 3 octaves
    const ratioImpact = Math.pow(normalizedDeviation, ratioExponent);
    
    // Step 3: Apply size premium curves with ratio amplification
    // Size premiums are amplified based on ratio imbalance
    const cpuSizeThreshold = this.config.vmSizeThreshold || 4;
    const baseSizePremiumFactor = this.config.vmSizePenaltyFactor || 0.3;
    const cpuCurveExponent = this.config.vmSizeCurveExponent || 2;
    
    // CPU premium calculation
    let cpuBasePremium = 0;
    if (vCPUs > cpuSizeThreshold) {
      const cpuAboveThreshold = vCPUs - cpuSizeThreshold;
      const cpuNormalized = Math.min(cpuAboveThreshold / (64 - cpuSizeThreshold), 1);
      cpuBasePremium = Math.pow(cpuNormalized, cpuCurveExponent) * baseSizePremiumFactor;
    }
    
    // Memory premium calculation  
    const memSizeThreshold = cpuSizeThreshold * naturalRatio;
    let memBasePremium = 0;
    if (memoryGB > memSizeThreshold) {
      const memAboveThreshold = memoryGB - memSizeThreshold;
      const memNormalized = Math.min(memAboveThreshold / (256 - memSizeThreshold), 1);
      memBasePremium = Math.pow(memNormalized, cpuCurveExponent) * baseSizePremiumFactor;
    }
    
    // Apply ratio amplification to size premiums
    // The ratio impact factor controls how much imbalance amplifies premiums
    const ratioAmplification = 1 + (ratioImpact * this.config.sizePenaltyFactor);
    const cpuPremium = cpuBasePremium * ratioAmplification;
    const memPremium = memBasePremium * ratioAmplification;
    
    // Step 4: Calculate costs with amplified premiums
    const cpuCostWithPremium = baseLinearCpuCost * (1 + cpuPremium);
    const memCostWithPremium = baseLinearMemCost * (1 + memPremium);
    
    // Step 5: Apply ratio inefficiency surcharge
    // This is now a more meaningful percentage, configurable up to 30%
    // The surcharge is based on the smaller of CPU or memory costs to preserve monotonicity
    const smallerBaseCost = Math.min(baseLinearCpuCost, baseLinearMemCost);
    const maxRatioSurcharge = smallerBaseCost * 0.3; // Max 30% of smaller cost
    const ratioSurcharge = ratioImpact * maxRatioSurcharge * this.config.sizePenaltyFactor;
    
    // Step 6: Apply balance discount for well-balanced VMs
    // Small discount that rewards balanced configurations
    const balanceScore = 1 - ratioImpact; // Inverse of ratio impact
    const maxBalanceDiscount = 0.05 * this.config.sizePenaltyFactor; // Up to 5% discount
    const totalBeforeDiscount = cpuCostWithPremium + memCostWithPremium + baseStorageCost;
    const balanceDiscount = totalBeforeDiscount * balanceScore * maxBalanceDiscount;
    
    // Final price calculation
    const baseHourlyPrice = totalBeforeDiscount + ratioSurcharge - balanceDiscount;
    const monthlyPrice = baseHourlyPrice * 730;

    // Calculate effective premiums for display
    const totalBaseCost = baseLinearCpuCost + baseLinearMemCost;
    const totalPremium = (cpuCostWithPremium - baseLinearCpuCost) + (memCostWithPremium - baseLinearMemCost) + ratioSurcharge;
    const effectiveTotalPremium = totalBaseCost > 0 ? totalPremium / totalBaseCost : 0;
    
    // Separate base size premium from ratio effects
    const avgBaseSizePremium = (cpuBasePremium + memBasePremium) / 2;
    
    // Calculate ratio penalty as combination of amplification and surcharge
    const ratioEffectPercent = totalBaseCost > 0 ? 
      ((ratioAmplification - 1) * (cpuBasePremium * baseLinearCpuCost + memBasePremium * baseLinearMemCost) + ratioSurcharge) / totalBaseCost : 0;
    
    // Calculate VM-specific licensing cost
    const vmLicensingCost = licensingCostPerVCPUHour * vCPUs;

    // Detailed cost breakdown
    return {
      vCPU: vCPUs,
      memoryGB,
      storageGB,
      baseHourlyPrice,
      monthlyPrice,
      breakdown: {
        computeCost: cpuCostWithPremium,  // Total CPU cost including premiums
        networkCost: memCostWithPremium,  // Total memory cost including premiums (labeled as network for legacy)
        storageCost: baseStorageCost,
        licensingCost: vmLicensingCost,  // Licensing cost based on vCPU allocation
        haOverheadMultiplier: 1, // HA overhead is already accounted for in capacity reduction
        sizePenalty: effectiveTotalPremium,  // Total effective premium
        ratioPenalty: ratioEffectPercent,  // Ratio effects (amplification + surcharge)
        vmSizePenalty: avgBaseSizePremium,  // Base size premium before ratio amplification
        ratioDeviation: absRatioDeviation,
        effectiveMargin: this.calculateEffectiveMargin(baseCosts, infrastructureCosts)
      }
    };
  }

  private generateSamplePrices(
    baseCosts: { cpuCost: number; memoryCost: number },
    capacity: ClusterCapacity
  ): VMPricing[] {
    const samples: VMPricing[] = [];
    
    // Common VM sizes
    const vmSizes = [
      { vCPU: 1, memory: 2 },
      { vCPU: 2, memory: 4 },
      { vCPU: 4, memory: 8 },
      { vCPU: 8, memory: 16 },
      { vCPU: 16, memory: 32 },
      { vCPU: 32, memory: 64 },
      { vCPU: 48, memory: 96 },
      { vCPU: 64, memory: 128 }
    ];

    vmSizes.forEach(size => {
      samples.push(this.calculateVMPrice(size.vCPU, size.memory, 100)); // Default 100GB storage for samples
    });

    return samples;
  }

  generate3DPricingData(
    maxVCPU: number = 64,
    maxMemory: number = 256,
    step: number = 4
  ): {
    x: number[]; // vCPU values
    y: number[]; // Memory values
    z: number[][]; // Price matrix
  } {
    const x: number[] = [];
    const y: number[] = [];
    const z: number[][] = [];

    for (let cpu = 1; cpu <= maxVCPU; cpu += step) {
      x.push(cpu);
    }

    for (let mem = 2; mem <= maxMemory; mem += step * 2) {
      y.push(mem);
    }

    for (let i = 0; i < y.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < x.length; j++) {
        const pricing = this.calculateVMPrice(x[j], y[i], 0); // No storage for 3D visualization
        row.push(pricing.monthlyPrice);
      }
      z.push(row);
    }

    return { x, y, z };
  }

  public getAllComponents(): PlacedComponent[] {
    if (!this.design) return [];
    
    const components: PlacedComponent[] = [];
    
    // Convert design components to PlacedComponents
    if (this.design.componentRoles) {
      this.design.componentRoles.forEach(role => {
        if (role.assignedComponentId) {
          const component = this.componentTemplates.find(
            (c) => c.id === role.assignedComponentId
          );
          if (component) {
            components.push({
              id: role.id,
              component,
              quantity: role.adjustedRequiredCount || role.requiredCount || 1,
              metadata: {
                cluster_id: role.clusterInfo?.clusterId,
                cluster_name: role.clusterInfo?.clusterName,
                role: role.role
              }
            });
          }
        }
      });
    }
    
    return components;
  }
}