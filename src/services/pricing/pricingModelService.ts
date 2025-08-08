import { InfrastructureDesign, InfrastructureComponent, ComponentRole } from '@/types/infrastructure';
import { PlacedComponent, ComputeCluster } from '@/types/placement';

export interface PricingConfig {
  operatingModel: 'costPlus' | 'fixedPrice';
  profitMargin: number; // Multiplier for cost plus model (e.g., 1.3 = 30% margin)
  fixedCpuPrice?: number; // $/vCPU/hour for fixed price model
  fixedMemoryPrice?: number; // $/GB/hour for fixed price model
  fixedStoragePrice?: number; // $/TB/hour for fixed price model
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

    computeComponents.forEach(comp => {
      const qty = comp.quantity || 1;
      const component = comp.component;
      
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
    const cpuOversubscription = this.design.requirements?.compute?.cpu?.oversubscriptionRatio || 4;
    const memoryOversubscription = this.design.requirements?.compute?.memory?.oversubscriptionRatio || 1;

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

  private getClusterComponents(): PlacedComponent[] {
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
    
    // Allocate costs between CPU and memory based on their ratio
    // Total units = vCPUs + (Memory / ratio)
    const totalWeightedUnits = capacity.sellingvCPUs + (capacity.sellingMemoryGB / cpuMemoryRatio);
    
    if (totalWeightedUnits === 0) {
      return { cpuCost: 0, memoryCost: 0, storageCost: 0 };
    }

    const costPerWeightedUnit = totalMonthlyCost / totalWeightedUnits / hoursPerMonth;
    
    // Apply profit margin for cost plus model
    const margin = this.config.profitMargin;
    
    const result = {
      cpuCost: costPerWeightedUnit * margin,
      memoryCost: (costPerWeightedUnit / cpuMemoryRatio) * margin,
      storageCost: 0.00005 * margin // $0.05 per TB per hour = ~$36/TB/month
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
    
    // MONOTONIC PRICING MODEL
    // Guarantees that P(c1, m1) <= P(c2, m2) when c1 <= c2 and m1 <= m2
    // Key principle: Each resource has its own monotonic price curve, with optional synergy discount
    
    // Step 1: Calculate base linear costs
    const baseLinearCpuCost = baseCosts.cpuCost * vCPUs;
    const baseLinearMemCost = baseCosts.memoryCost * memoryGB;
    const baseStorageCost = baseCosts.storageCost * storageGB;
    
    // Step 2: Apply monotonic premium curves to each resource independently
    // These curves are strictly increasing in their respective dimensions
    
    // CPU premium curve: f(cpu) - monotonically increasing
    const cpuSizeThreshold = this.config.vmSizeThreshold || 4;
    const cpuPremiumFactor = this.config.vmSizePenaltyFactor || 0.3;
    const cpuCurveExponent = this.config.vmSizeCurveExponent || 2;
    
    let cpuPremium = 0;
    if (vCPUs > cpuSizeThreshold) {
      const cpuAboveThreshold = vCPUs - cpuSizeThreshold;
      const cpuNormalized = cpuAboveThreshold / (64 - cpuSizeThreshold); // Normalize to [0,1]
      cpuPremium = Math.pow(cpuNormalized, cpuCurveExponent) * cpuPremiumFactor;
    }
    
    // Memory premium curve: g(mem) - monotonically increasing  
    const memSizeThreshold = cpuSizeThreshold * naturalRatio; // Scale threshold by natural ratio
    const memPremiumFactor = cpuPremiumFactor; // Same premium factor
    
    let memPremium = 0;
    if (memoryGB > memSizeThreshold) {
      const memAboveThreshold = memoryGB - memSizeThreshold;
      const memNormalized = memAboveThreshold / (256 - memSizeThreshold); // Normalize to [0,1]
      memPremium = Math.pow(memNormalized, cpuCurveExponent) * memPremiumFactor;
    }
    
    // Step 3: Calculate costs with independent premiums (guarantees monotonicity)
    const cpuCostWithPremium = baseLinearCpuCost * (1 + cpuPremium);
    const memCostWithPremium = baseLinearMemCost * (1 + memPremium);
    
    // Step 4: Apply balance discount (NOT penalty) for well-balanced VMs
    // This is a small discount, never a penalty, preserving monotonicity
    const vmRatio = memoryGB / vCPUs;
    const ratioDeviation = Math.abs(Math.log2(vmRatio / naturalRatio));
    
    // Calculate balance score (1 = perfect balance, 0 = highly imbalanced)
    const balanceScore = Math.exp(-ratioDeviation * 0.5); // Exponential decay from 1 to 0
    
    // Maximum discount for perfect balance (e.g., 5% discount)
    const maxBalanceDiscount = 0.05;
    const balanceDiscount = balanceScore * maxBalanceDiscount;
    
    // Apply balance discount to total (ensures price still increases with resources)
    const totalBeforeDiscount = cpuCostWithPremium + memCostWithPremium + baseStorageCost;
    const balanceAdjustment = totalBeforeDiscount * balanceDiscount;
    
    // Step 5: Add ratio inefficiency charge (small, capped addition)
    // This represents the operational complexity of imbalanced VMs
    // Critically: This is ADDITIVE and CAPPED to preserve monotonicity
    const maxRatioCharge = Math.min(
      baseLinearCpuCost * 0.1,  // Cap at 10% of base CPU cost
      baseLinearMemCost * 0.1   // or 10% of base memory cost
    );
    const ratioInefficiencyCharge = (1 - balanceScore) * maxRatioCharge * this.config.sizePenaltyFactor;
    
    // Final price calculation
    const baseHourlyPrice = totalBeforeDiscount - balanceAdjustment + ratioInefficiencyCharge;
    const monthlyPrice = baseHourlyPrice * 730;

    // Calculate effective premiums for display
    const totalBaseCost = baseLinearCpuCost + baseLinearMemCost;
    const totalPremium = (cpuCostWithPremium - baseLinearCpuCost) + (memCostWithPremium - baseLinearMemCost);
    const effectiveTotalPremium = totalBaseCost > 0 ? totalPremium / totalBaseCost : 0;
    
    // Calculate size penalty (average of CPU and memory premiums)
    const avgSizePremium = (cpuPremium + memPremium) / 2;
    
    // Calculate ratio penalty (inefficiency charge as percentage of base)
    const ratioInefficiencyPercent = totalBaseCost > 0 ? ratioInefficiencyCharge / totalBaseCost : 0;
    
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
        ratioPenalty: ratioInefficiencyPercent,  // Ratio inefficiency as percentage
        vmSizePenalty: avgSizePremium,  // Average size premium
        ratioDeviation: ratioDeviation,
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

  private getAllComponents(): PlacedComponent[] {
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