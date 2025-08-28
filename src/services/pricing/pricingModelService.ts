import { InfrastructureDesign, InfrastructureComponent, ComponentRole } from '@/types/infrastructure';
import { PlacedComponent, ComputeCluster } from '@/types/placement';

export interface PricingConfig {
  operatingModel: 'costPlus' | 'fixedPrice';
  profitMargin: number; // Multiplier for cost plus model (e.g., 1.3 = 30% margin)
  fixedCpuPrice?: number; // $/vCPU/hour for fixed price model
  fixedMemoryPrice?: number; // $/GB/hour for fixed price model
  fixedStoragePrice?: number; // $/GB/hour for fixed price model
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
}

export interface PricingModelResult {
  clusterCapacity: ClusterCapacity;
  cpuMemoryWeightRatio: number;
  baseCostPerVCPU: number;
  baseCostPerGBMemory: number;
  effectiveMargin: number;
  samplePrices: VMPricing[];
}

export class PricingModelService {
  private design: InfrastructureDesign | null;
  private config: PricingConfig;
  private selectedClusterId?: string;
  private componentTemplates: InfrastructureComponent[];

  constructor(
    design: InfrastructureDesign | null, 
    config: PricingConfig, 
    componentTemplates: InfrastructureComponent[] = [],
    selectedClusterId?: string
  ) {
    this.design = design;
    this.config = config;
    this.componentTemplates = componentTemplates;
    this.selectedClusterId = selectedClusterId;
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
    const infrastructureCosts = this.calculateInfrastructureCosts();
    const cpuMemoryRatio = this.calculateCpuMemoryWeightRatio(clusterCapacity);
    
    const baseCosts = this.calculateBaseCosts(
      infrastructureCosts,
      clusterCapacity,
      cpuMemoryRatio
    );

    const samplePrices = this.generateSamplePrices(baseCosts, clusterCapacity);

    return {
      clusterCapacity,
      cpuMemoryWeightRatio: cpuMemoryRatio,
      baseCostPerVCPU: baseCosts.cpuCost,
      baseCostPerGBMemory: baseCosts.memoryCost,
      effectiveMargin: this.calculateEffectiveMargin(baseCosts, infrastructureCosts),
      samplePrices
    };
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
        targetUtilization: this.config.targetUtilization
      };
    }

    // Already filtered in getClusterComponents()

    let totalPhysicalCores = 0;
    let totalPhysicalMemoryGB = 0;
    let totalPhysicalNodes = 0;

    computeComponents.forEach(comp => {
      const qty = comp.quantity || 1;
      const component = comp.component;
      totalPhysicalNodes += qty;  // Count the actual nodes
      
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

    const totalvCPUs = totalPhysicalCores * cpuOversubscription;
    const totalMemoryGB = totalPhysicalMemoryGB * memoryOversubscription;

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

    return {
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
      targetUtilization: this.config.targetUtilization
    };
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
    console.log('[PricingModelService] Calculating costs for components:', allComponents.length);
    
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
      if (comp.component.type === 'network') {
        const az = comp.metadata?.availability_zone || 'default';
        const currentCost = networkCostPerAZ.get(az) || 0;
        networkCostPerAZ.set(az, currentCost + capex + (opex / 12));
      }
    });

    // Amortize capital over 5 years
    const monthlyCapital = totalCapitalCost / 60;
    const monthlyOperational = totalOperationalCost / 12;
    const totalMonthlyCost = monthlyCapital + monthlyOperational;

    console.log('[PricingModelService] Infrastructure costs:', {
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
      return {
        cpuCost: this.config.fixedCpuPrice || 0.01,
        memoryCost: this.config.fixedMemoryPrice || 0.003,
        storageCost: this.config.fixedStoragePrice || 0.0001
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
      // Default storage cost if no storage infrastructure
      storageCostPerGBHour = 0.00005; // ~$0.036/GB/month
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
      totalWeightedUnits,
      costPerWeightedUnit,
      margin,
      result
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
        licensingCost: 0,  // Can be added based on requirements
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