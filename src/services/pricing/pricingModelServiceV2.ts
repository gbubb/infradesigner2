// Alternative pricing calculation that ensures monotonicity
// This version applies premiums to individual resources, not the total

export function calculateVMPriceMonotonic(
  vCPUs: number,
  memoryGB: number,
  storageGB: number,
  baseCosts: { cpuCost: number; memoryCost: number; storageCost: number },
  capacity: { totalvCPUs: number; totalMemoryGB: number },
  config: {
    sizePenaltyFactor: number;
    ratioPenaltyExponent?: number;
    vmSizePenaltyFactor?: number;
    vmSizeCurveExponent?: number;
    vmSizeThreshold?: number;
    vmSizeAcceleration?: number;
  }
) {
  // Calculate natural ratio
  const naturalRatio = capacity.totalMemoryGB / capacity.totalvCPUs; // e.g., 4 for 1:4 ratio
  
  // Method 1: Split premium between resources proportionally
  // This ensures that reducing either resource always reduces cost
  
  // Calculate base costs
  const baseCpuCost = baseCosts.cpuCost * vCPUs;
  const baseMemoryCost = baseCosts.memoryCost * memoryGB;
  const baseStorageCost = baseCosts.storageCost * storageGB;
  
  // Calculate size premium (applies to both CPU and memory)
  const vmSizeFactor = config.vmSizePenaltyFactor || 0.3;
  const threshold = config.vmSizeThreshold || 4;
  const exponent = config.vmSizeCurveExponent || 2;
  const acceleration = config.vmSizeAcceleration || 0.5;
  
  // Use the larger of the two dimensions for size penalty
  const effectiveSize = Math.max(vCPUs, memoryGB / naturalRatio);
  
  let sizePremium = 0;
  if (effectiveSize > threshold) {
    const excess = effectiveSize - threshold;
    const curvedSize = Math.pow(excess / threshold, exponent);
    const basePremium = curvedSize * vmSizeFactor;
    sizePremium = basePremium * (1 + acceleration * curvedSize);
  }
  
  // Calculate ratio deviation premium
  const vmRatio = memoryGB / vCPUs;
  const ratioDeviation = Math.abs(Math.log2(vmRatio) - Math.log2(naturalRatio));
  const ratioExponent = config.ratioPenaltyExponent || 2;
  const ratioPremium = Math.pow(ratioDeviation, ratioExponent) * config.sizePenaltyFactor;
  
  // Apply premiums to each resource individually
  // This ensures reducing a resource always reduces its cost component
  const cpuWithPremium = baseCpuCost * (1 + sizePremium);
  const memoryWithPremium = baseMemoryCost * (1 + sizePremium);
  
  // Apply ratio premium as a "tax" on the imbalanced configuration
  // Split it proportionally based on which resource is over-provisioned
  let cpuRatioPremium = 0;
  let memoryRatioPremium = 0;
  
  if (vmRatio > naturalRatio) {
    // Memory-heavy: apply more premium to memory
    const memoryExcess = memoryGB - (vCPUs * naturalRatio);
    memoryRatioPremium = (memoryExcess / memoryGB) * baseMemoryCost * ratioPremium;
  } else if (vmRatio < naturalRatio) {
    // CPU-heavy: apply more premium to CPU
    const cpuExcess = vCPUs - (memoryGB / naturalRatio);
    cpuRatioPremium = (cpuExcess / vCPUs) * baseCpuCost * ratioPremium;
  }
  
  // Final costs
  const finalCpuCost = cpuWithPremium + cpuRatioPremium;
  const finalMemoryCost = memoryWithPremium + memoryRatioPremium;
  const finalStorageCost = baseStorageCost; // No premium on storage
  
  const totalCost = finalCpuCost + finalMemoryCost + finalStorageCost;
  
  return {
    baseHourlyPrice: totalCost,
    monthlyPrice: totalCost * 730,
    breakdown: {
      cpuCost: finalCpuCost,
      memoryCost: finalMemoryCost,
      storageCost: finalStorageCost,
      sizePremium: sizePremium,
      ratioPremium: ratioPremium,
      cpuRatioPremium: cpuRatioPremium / baseCpuCost,
      memoryRatioPremium: memoryRatioPremium / baseMemoryCost,
    }
  };
}

// Method 2: Apply premiums only to the "excess" resources
// This is even more strictly monotonic
export function calculateVMPriceExcessOnly(
  vCPUs: number,
  memoryGB: number,
  storageGB: number,
  baseCosts: { cpuCost: number; memoryCost: number; storageCost: number },
  capacity: { totalvCPUs: number; totalMemoryGB: number },
  config: {
    sizePenaltyFactor: number;
    ratioPenaltyExponent?: number;
    vmSizePenaltyFactor?: number;
    vmSizeCurveExponent?: number;
    vmSizeThreshold?: number;
    vmSizeAcceleration?: number;
  }
) {
  const naturalRatio = capacity.totalMemoryGB / capacity.totalvCPUs;
  
  // Calculate base costs
  const _baseCpuCost = baseCosts.cpuCost * vCPUs;
  const _baseMemoryCost = baseCosts.memoryCost * memoryGB;
  const baseStorageCost = baseCosts.storageCost * storageGB;
  
  // Determine the "balanced" portion (no premium)
  const balancedCPU = Math.min(vCPUs, memoryGB / naturalRatio);
  const balancedMemory = Math.min(memoryGB, vCPUs * naturalRatio);
  
  // Calculate excess (imbalanced) resources
  const excessCPU = Math.max(0, vCPUs - balancedCPU);
  const excessMemory = Math.max(0, memoryGB - balancedMemory);
  
  // Apply premiums only to excess resources
  const _ratioExponent = config.ratioPenaltyExponent || 2;
  const ratioPenaltyMultiplier = 1 + config.sizePenaltyFactor;
  
  // Size premium calculation
  const threshold = config.vmSizeThreshold || 4;
  const vmSizeFactor = config.vmSizePenaltyFactor || 0.3;
  const sizeExponent = config.vmSizeCurveExponent || 2;
  
  let sizePremiumMultiplier = 1;
  const maxDimension = Math.max(vCPUs, memoryGB / naturalRatio);
  if (maxDimension > threshold) {
    const excess = maxDimension - threshold;
    const curvedSize = Math.pow(excess / threshold, sizeExponent);
    sizePremiumMultiplier = 1 + curvedSize * vmSizeFactor;
  }
  
  // Calculate costs with premiums
  const balancedCpuCost = baseCosts.cpuCost * balancedCPU * sizePremiumMultiplier;
  const balancedMemoryCost = baseCosts.memoryCost * balancedMemory * sizePremiumMultiplier;
  
  // Excess resources get both size and ratio premiums
  const excessCpuCost = baseCosts.cpuCost * excessCPU * sizePremiumMultiplier * ratioPenaltyMultiplier;
  const excessMemoryCost = baseCosts.memoryCost * excessMemory * sizePremiumMultiplier * ratioPenaltyMultiplier;
  
  const totalCost = balancedCpuCost + balancedMemoryCost + excessCpuCost + excessMemoryCost + baseStorageCost;
  
  return {
    baseHourlyPrice: totalCost,
    monthlyPrice: totalCost * 730,
    breakdown: {
      balancedCpuCost,
      balancedMemoryCost,
      excessCpuCost,
      excessMemoryCost,
      storageCost: baseStorageCost,
      sizePremiumMultiplier: sizePremiumMultiplier - 1,
      ratioPremiumMultiplier: ratioPenaltyMultiplier - 1,
    }
  };
}