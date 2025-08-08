// Test script to verify pricing monotonicity with new algorithm
// Run with: node test-pricing-monotonicity-v2.js

function testMonotonicityV2() {
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

  // Simulate the updated pricing logic with proportional premiums
  function calculatePrice(vCPUs, memoryGB) {
    const naturalRatio = capacity.totalMemoryGB / capacity.totalvCPUs; // 4
    
    // Base costs
    const baseCpuCost = baseCosts.cpuCost * vCPUs;
    const baseMemoryCost = baseCosts.memoryCost * memoryGB;
    
    // Calculate size penalty
    const effectiveSize = Math.max(vCPUs, memoryGB / naturalRatio);
    let sizePenalty = 1;
    if (effectiveSize > config.vmSizeThreshold) {
      const excess = effectiveSize - config.vmSizeThreshold;
      const curvedSize = Math.pow(excess / config.vmSizeThreshold, config.vmSizeCurveExponent);
      const basePremium = curvedSize * config.vmSizePenaltyFactor;
      const acceleration = config.vmSizeAcceleration || 0.5;
      sizePenalty = 1 + basePremium * (1 + acceleration * curvedSize);
    }
    
    // Apply size premium to both resources equally
    const cpuSizeCost = baseCpuCost * sizePenalty;
    const memorySizeCost = baseMemoryCost * sizePenalty;
    
    // Calculate ratio deviation and premium
    const vmRatio = memoryGB / vCPUs;
    const ratioDeviation = Math.abs(Math.log2(vmRatio) - Math.log2(naturalRatio));
    const ratioPremiumFactor = Math.pow(ratioDeviation, config.ratioPenaltyExponent) * config.sizePenaltyFactor;
    
    // Apply ratio premium proportionally
    let cpuRatioPremium = 0;
    let memoryRatioPremium = 0;
    
    if (vmRatio > naturalRatio) {
      // Memory-heavy: premium mostly on memory
      const balancedMemory = vCPUs * naturalRatio;
      const excessRatio = Math.max(0, (memoryGB - balancedMemory) / memoryGB);
      memoryRatioPremium = memorySizeCost * ratioPremiumFactor * excessRatio;
      cpuRatioPremium = cpuSizeCost * ratioPremiumFactor * 0.1; // Small penalty
    } else if (vmRatio < naturalRatio) {
      // CPU-heavy: premium mostly on CPU
      const balancedCPU = memoryGB / naturalRatio;
      const excessRatio = Math.max(0, (vCPUs - balancedCPU) / vCPUs);
      cpuRatioPremium = cpuSizeCost * ratioPremiumFactor * excessRatio;
      memoryRatioPremium = memorySizeCost * ratioPremiumFactor * 0.1; // Small penalty
    }
    
    // Final costs
    const cpuCost = cpuSizeCost + cpuRatioPremium;
    const memoryCost = memorySizeCost + memoryRatioPremium;
    
    return cpuCost + memoryCost;
  }

  console.log("Testing Pricing Monotonicity V2 (Proportional Premiums)\n");
  console.log("Natural Ratio: 1:4 (CPU:Memory)");
  console.log("=======================================================\n");

  // Test 1: Reducing CPU should always reduce cost
  console.log("Test 1: Reducing CPU (fixed 16GB memory)");
  console.log("------------------------------------------");
  const memFixed = 16;
  let prevCpuPrice = Infinity;
  for (let cpu = 8; cpu >= 1; cpu--) {
    const price = calculatePrice(cpu, memFixed);
    const delta = price - prevCpuPrice;
    const status = delta <= 0 ? "✓" : "✗";
    console.log(`${status} ${cpu} vCPU, ${memFixed} GB: $${price.toFixed(4)}/hr (Δ: ${delta.toFixed(4)})`);
    prevCpuPrice = price;
  }

  // Test 2: Reducing memory should always reduce cost
  console.log("\nTest 2: Reducing Memory (fixed 4 vCPU)");
  console.log("------------------------------------------");
  const cpuFixed = 4;
  let prevMemPrice = Infinity;
  for (let mem = 32; mem >= 4; mem -= 4) {
    const price = calculatePrice(cpuFixed, mem);
    const delta = price - prevMemPrice;
    const status = delta <= 0 ? "✓" : "✗";
    console.log(`${status} ${cpuFixed} vCPU, ${mem} GB: $${price.toFixed(4)}/hr (Δ: ${delta.toFixed(4)})`);
    prevMemPrice = price;
  }

  // Test 3: Comprehensive monotonicity check
  console.log("\nTest 3: Comprehensive Monotonicity Check");
  console.log("------------------------------------------");
  let failedTests = 0;
  let passedTests = 0;
  
  // Check CPU monotonicity for various memory sizes
  for (let mem = 4; mem <= 64; mem += 4) {
    let prevPrice = Infinity;
    for (let cpu = 16; cpu >= 1; cpu--) {
      const price = calculatePrice(cpu, mem);
      if (price > prevPrice) {
        failedTests++;
        if (failedTests <= 5) { // Show first 5 failures
          console.log(`❌ FAILED: ${cpu+1}→${cpu} vCPU @ ${mem}GB: ${prevPrice.toFixed(4)} → ${price.toFixed(4)}`);
        }
      } else {
        passedTests++;
      }
      prevPrice = price;
    }
  }
  
  // Check Memory monotonicity for various CPU sizes
  for (let cpu = 1; cpu <= 16; cpu++) {
    let prevPrice = Infinity;
    for (let mem = 64; mem >= 4; mem -= 4) {
      const price = calculatePrice(cpu, mem);
      if (price > prevPrice) {
        failedTests++;
        if (failedTests <= 10) { // Show first 10 failures total
          console.log(`❌ FAILED: ${mem+4}→${mem}GB @ ${cpu} vCPU: ${prevPrice.toFixed(4)} → ${price.toFixed(4)}`);
        }
      } else {
        passedTests++;
      }
      prevPrice = price;
    }
  }
  
  console.log(`\nResults: ${passedTests} passed, ${failedTests} failed`);
  
  if (failedTests === 0) {
    console.log("✅ All monotonicity tests passed!");
  } else {
    console.log(`❌ ${failedTests} monotonicity tests failed!`);
  }

  // Test 4: Validate premium behavior
  console.log("\nTest 4: Premium Behavior Validation");
  console.log("------------------------------------------");
  
  const testConfigs = [
    { cpu: 4, mem: 16, desc: "Balanced (1:4)" },
    { cpu: 8, mem: 32, desc: "Balanced Large (1:4)" },
    { cpu: 4, mem: 8, desc: "CPU-heavy (1:2)" },
    { cpu: 2, mem: 16, desc: "Memory-heavy (1:8)" },
  ];

  testConfigs.forEach(({ cpu, mem, desc }) => {
    const price = calculatePrice(cpu, mem);
    const basePrice = baseCosts.cpuCost * cpu + baseCosts.memoryCost * mem;
    const premium = ((price - basePrice) / basePrice * 100).toFixed(1);
    console.log(`${desc}: ${cpu} vCPU, ${mem} GB: $${price.toFixed(4)}/hr (+${premium}% premium)`);
  });
}

testMonotonicityV2();