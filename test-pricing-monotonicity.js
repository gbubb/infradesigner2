// Test script to verify pricing monotonicity
// Run with: node test-pricing-monotonicity.js

function testMonotonicity() {
  // Mock configuration
  const config = {
    sizePenaltyFactor: 0.5,
    ratioPenaltyExponent: 2,
    vmSizePenaltyFactor: 0.3,
    vmSizeCurveExponent: 2,
    vmSizeThreshold: 4,
    vmSizeAcceleration: 0.5
  };

  const capacity = {
    totalvCPUs: 1000,
    totalMemoryGB: 4000 // 1:4 ratio
  };

  const baseCosts = {
    cpuCost: 0.01, // per vCPU per hour
    memoryCost: 0.003, // per GB per hour
    storageCost: 0.00005 // per GB per hour
  };

  // Simulate the new pricing logic
  function calculatePrice(vCPUs, memoryGB) {
    const naturalRatio = capacity.totalMemoryGB / capacity.totalvCPUs; // 4
    
    // Base costs
    const baseCpuCost = baseCosts.cpuCost * vCPUs;
    const baseMemoryCost = baseCosts.memoryCost * memoryGB;
    
    // Determine balanced vs excess
    const balancedCPU = Math.min(vCPUs, memoryGB / naturalRatio);
    const balancedMemory = Math.min(memoryGB, vCPUs * naturalRatio);
    const excessCPU = Math.max(0, vCPUs - balancedCPU);
    const excessMemory = Math.max(0, memoryGB - balancedMemory);
    
    // Size penalty
    const effectiveSize = Math.max(vCPUs, memoryGB / naturalRatio);
    let sizePenalty = 1;
    if (effectiveSize > config.vmSizeThreshold) {
      const excess = effectiveSize - config.vmSizeThreshold;
      const curvedSize = Math.pow(excess / config.vmSizeThreshold, config.vmSizeCurveExponent);
      sizePenalty = 1 + curvedSize * config.vmSizePenaltyFactor;
    }
    
    // Ratio penalty (only for excess)
    let ratioPenalty = 1;
    if (excessCPU > 0 || excessMemory > 0) {
      const vmRatio = memoryGB / vCPUs;
      const ratioDeviation = Math.abs(Math.log2(vmRatio) - Math.log2(naturalRatio));
      ratioPenalty = 1 + Math.pow(ratioDeviation, config.ratioPenaltyExponent) * config.sizePenaltyFactor;
    }
    
    // Calculate costs
    const balancedCpuCost = (baseCosts.cpuCost * balancedCPU) * sizePenalty;
    const balancedMemoryCost = (baseCosts.memoryCost * balancedMemory) * sizePenalty;
    const excessCpuCost = (baseCosts.cpuCost * excessCPU) * sizePenalty * ratioPenalty;
    const excessMemoryCost = (baseCosts.memoryCost * excessMemory) * sizePenalty * ratioPenalty;
    
    return balancedCpuCost + balancedMemoryCost + excessCpuCost + excessMemoryCost;
  }

  console.log("Testing Pricing Monotonicity\n");
  console.log("Natural Ratio: 1:4 (CPU:Memory)");
  console.log("================================\n");

  // Test 1: Reducing CPU should always reduce cost
  console.log("Test 1: Reducing CPU (fixed 16GB memory)");
  console.log("------------------------------------------");
  const memFixed = 16;
  for (let cpu = 8; cpu >= 1; cpu--) {
    const price = calculatePrice(cpu, memFixed);
    console.log(`${cpu} vCPU, ${memFixed} GB: $${price.toFixed(4)}/hr`);
  }

  // Test 2: Reducing memory should always reduce cost
  console.log("\nTest 2: Reducing Memory (fixed 4 vCPU)");
  console.log("------------------------------------------");
  const cpuFixed = 4;
  for (let mem = 32; mem >= 4; mem -= 4) {
    const price = calculatePrice(cpuFixed, mem);
    console.log(`${cpuFixed} vCPU, ${mem} GB: $${price.toFixed(4)}/hr`);
  }

  // Test 3: Balanced ratios should be cheaper
  console.log("\nTest 3: Comparing Balanced vs Imbalanced");
  console.log("------------------------------------------");
  const configs = [
    { cpu: 4, mem: 16, desc: "Balanced (1:4)" },
    { cpu: 4, mem: 8, desc: "CPU-heavy (1:2)" },
    { cpu: 4, mem: 32, desc: "Memory-heavy (1:8)" },
    { cpu: 8, mem: 32, desc: "Balanced Large (1:4)" },
    { cpu: 8, mem: 16, desc: "CPU-heavy Large (1:2)" },
    { cpu: 8, mem: 64, desc: "Memory-heavy Large (1:8)" }
  ];

  configs.forEach(({ cpu, mem, desc }) => {
    const price = calculatePrice(cpu, mem);
    console.log(`${desc}: ${cpu} vCPU, ${mem} GB: $${price.toFixed(4)}/hr`);
  });

  // Test 4: Verify strict monotonicity
  console.log("\nTest 4: Monotonicity Check");
  console.log("------------------------------------------");
  let failedTests = 0;
  
  // Check CPU monotonicity
  for (let mem = 4; mem <= 64; mem += 4) {
    let prevPrice = Infinity;
    for (let cpu = 16; cpu >= 1; cpu--) {
      const price = calculatePrice(cpu, mem);
      if (price > prevPrice) {
        console.log(`❌ FAILED: Reducing CPU from ${cpu+1} to ${cpu} (${mem}GB) increased price!`);
        console.log(`   Previous: $${prevPrice.toFixed(4)}, Current: $${price.toFixed(4)}`);
        failedTests++;
      }
      prevPrice = price;
    }
  }
  
  // Check Memory monotonicity
  for (let cpu = 1; cpu <= 16; cpu++) {
    let prevPrice = Infinity;
    for (let mem = 64; mem >= 4; mem -= 4) {
      const price = calculatePrice(cpu, mem);
      if (price > prevPrice) {
        console.log(`❌ FAILED: Reducing memory from ${mem+4}GB to ${mem}GB (${cpu} vCPU) increased price!`);
        console.log(`   Previous: $${prevPrice.toFixed(4)}, Current: $${price.toFixed(4)}`);
        failedTests++;
      }
      prevPrice = price;
    }
  }
  
  if (failedTests === 0) {
    console.log("✅ All monotonicity tests passed!");
  } else {
    console.log(`\n❌ ${failedTests} monotonicity tests failed!`);
  }
}

testMonotonicity();