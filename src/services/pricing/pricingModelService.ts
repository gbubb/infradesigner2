import { DesignState } from '@/types/design';
import { PlacedComponent } from '@/types/placement';

export interface PricingConfig {
  operatingModel: 'costPlus' | 'fixedPrice';
  profitMargin: number; // Multiplier for cost plus model (e.g., 1.3 = 30% margin)
  fixedCpuPrice?: number; // $/vCPU/hour for fixed price model
  fixedMemoryPrice?: number; // $/GB/hour for fixed price model
  fixedStoragePrice?: number; // $/TB/hour for fixed price model
  targetUtilization: number; // Target cluster utilization (0-1)
  virtualizationOverhead: number; // Overhead percentage (0-1)
  sizePenaltyFactor: number; // Penalty multiplier for larger VMs
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
    sizePenalty: number;
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
  private design: DesignState;
  private config: PricingConfig;

  constructor(design: DesignState, config: PricingConfig) {
    this.design = design;
    this.config = config;
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

  private calculateClusterCapacity(): ClusterCapacity {
    const computeComponents = this.design.placedComponents.filter(
      comp => comp.component.type === 'compute'
    );

    let totalPhysicalCores = 0;
    let totalPhysicalMemoryGB = 0;

    computeComponents.forEach(comp => {
      const qty = comp.quantity || 1;
      const cores = comp.component.specifications?.cpu?.cores || 0;
      const memory = comp.component.specifications?.memory?.capacity || 0;
      
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

    // Apply overheads
    const afterVirtualization = 1 - this.config.virtualizationOverhead;
    const afterHA = 1 - haReservation;
    const afterTarget = this.config.targetUtilization;

    const usablevCPUs = totalvCPUs * afterVirtualization * afterHA;
    const usableMemoryGB = totalMemoryGB * afterVirtualization * afterHA;

    const sellingvCPUs = usablevCPUs * afterTarget;
    const sellingMemoryGB = usableMemoryGB * afterTarget;

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
    // Group components by availability zone
    const azGroups = new Map<string, number>();
    
    computeComponents.forEach(comp => {
      const az = comp.metadata?.availability_zone || 'default';
      const count = azGroups.get(az) || 0;
      azGroups.set(az, count + (comp.quantity || 1));
    });

    const totalHosts = Array.from(azGroups.values()).reduce((a, b) => a + b, 0);
    const numAZs = azGroups.size;

    // Calculate based on failure tolerance settings
    const failureTolerance = this.design.requirements?.compute?.availability?.failureTolerance || {
      hosts: 1,
      zones: 0
    };

    // Reservation = (failed zones * hosts per zone + additional failed hosts) / total hosts
    if (numAZs === 0 || totalHosts === 0) return 0;

    const hostsPerZone = Math.ceil(totalHosts / numAZs);
    const reservedHosts = (failureTolerance.zones * hostsPerZone) + failureTolerance.hosts;
    
    return Math.min(0.5, reservedHosts / totalHosts); // Cap at 50% reservation
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

    // Calculate costs for all placed components
    this.design.placedComponents.forEach(comp => {
      const qty = comp.quantity || 1;
      const capex = (comp.component.pricing?.basePrice || 0) * qty;
      const opex = (comp.component.pricing?.yearlyOperationalCost || 0) * qty;
      
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
    const computeComponents = this.design.placedComponents.filter(
      comp => comp.component.type === 'compute'
    );
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
    
    return {
      cpuCost: costPerWeightedUnit * margin,
      memoryCost: (costPerWeightedUnit / cpuMemoryRatio) * margin,
      storageCost: 0.00005 * margin // $0.05 per TB per hour = ~$36/TB/month
    };
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

  private calculateSizePenalty(vCPUs: number, memoryGB: number): number {
    // Calculate the natural ratio of the cluster
    const capacity = this.calculateClusterCapacity();
    const naturalRatio = capacity.totalvCPUs / capacity.totalMemoryGB; // e.g., 0.25 for 1:4 ratio
    
    // Calculate the VM's ratio
    const vmRatio = vCPUs / memoryGB;
    
    // Calculate deviation from natural ratio
    // Use log scale to handle both over and under ratios equally
    const logNaturalRatio = Math.log2(naturalRatio);
    const logVmRatio = Math.log2(vmRatio);
    const ratioDeviation = Math.abs(logVmRatio - logNaturalRatio);
    
    // Exponential penalty based on deviation
    // No penalty when ratio matches (deviation = 0)
    // Exponentially increasing penalty as deviation increases
    const penalty = Math.exp(ratioDeviation * this.config.sizePenaltyFactor) - 1;
    
    return 1 + penalty; // Return as multiplier (1 = no penalty)
  }

  calculateVMPrice(vCPUs: number, memoryGB: number, storageGB: number = 0): VMPricing {
    const capacity = this.calculateClusterCapacity();
    const infrastructureCosts = this.calculateInfrastructureCosts();
    const cpuMemoryRatio = this.calculateCpuMemoryWeightRatio(capacity);
    const baseCosts = this.calculateBaseCosts(infrastructureCosts, capacity, cpuMemoryRatio);
    
    const sizePenalty = this.calculateSizePenalty(vCPUs, memoryGB);
    
    const cpuCost = baseCosts.cpuCost * vCPUs;
    const memoryCost = baseCosts.memoryCost * memoryGB;
    const storageCost = baseCosts.storageCost * storageGB;
    
    const baseHourlyPrice = (cpuCost + memoryCost + storageCost) * sizePenalty;
    const monthlyPrice = baseHourlyPrice * 730;

    // Calculate breakdown
    const totalBaseCost = cpuCost + memoryCost;
    
    // Calculate ratio deviation for breakdown
    const naturalRatio = capacity.totalvCPUs / capacity.totalMemoryGB;
    const vmRatio = vCPUs / memoryGB;
    const logNaturalRatio = Math.log2(naturalRatio);
    const logVmRatio = Math.log2(vmRatio);
    const ratioDeviation = Math.abs(logVmRatio - logNaturalRatio);
    
    // Cost component ratios
    const computeRatio = 0.6; // 60% compute
    const networkRatio = 0.25; // 25% network
    const licensingRatio = 0.15; // 15% licensing

    return {
      vCPU: vCPUs,
      memoryGB,
      storageGB,
      baseHourlyPrice,
      monthlyPrice,
      breakdown: {
        computeCost: totalBaseCost * computeRatio,
        networkCost: totalBaseCost * networkRatio,
        storageCost: storageCost,
        licensingCost: totalBaseCost * licensingRatio,
        haOverheadMultiplier: 1 / (1 - capacity.haReservation),
        sizePenalty: sizePenalty - 1,
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
}