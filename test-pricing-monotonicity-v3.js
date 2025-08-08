// Test script to verify pricing monotonicity with strict excess-only premiums
// Run with: node test-pricing-monotonicity-v3.js

function testMonotonicityV3() {
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

  // Simulate the strict monotonic pricing logic
  function calculatePrice(vCPUs, memoryGB) {
    const naturalRatio = capacity.totalMemoryGB / capacity.totalvCPUs; // 4
    
    // Base costs
    const baseCpuCost = baseCosts.cpuCost * vCPUs;
    const baseMemoryCost = baseCosts.memoryCost * memoryGB;
    
    // Calculate size penalty (applies to all resources)
    const effectiveSize = Math.max(vCPUs, memoryGB / naturalRatio);
    let sizePenalty = 1;
    if (effectiveSize > config.vmSizeThreshold) {
      const excess = effectiveSize - config.vmSizeThreshold;
      const curvedSize = Math.pow(excess / config.vmSizeThreshold, config.vmSizeCurveExponent);
      const basePremium = curvedSize * config.vmSizePenaltyFactor;
      const acceleration = config.vmSizeAcceleration || 0.5;
      sizePenalty = 1 + basePremium * (1 + acceleration * curvedSize);
    }
    
    // Apply size premium to both resources
    const cpuSizeCost = baseCpuCost * sizePenalty;
    const memorySizeCost = baseMemoryCost * sizePenalty;
    
    // Calculate ratio deviation and premium factor
    const vmRatio = memoryGB / vCPUs;
    const ratioDeviation = Math.abs(Math.log2(vmRatio) - Math.log2(naturalRatio));
    const ratioPremiumFactor = Math.pow(ratioDeviation, config.ratioPenaltyExponent) * config.sizePenaltyFactor;
    
    // Apply ratio premium ONLY to excess resources
    let cpuRatioPremium = 0;
    let memoryRatioPremium = 0;
    
    if (vmRatio > naturalRatio) {
      // Memory-heavy: apply premium only to excess memory
      const balancedMemory = vCPUs * naturalRatio;
      const excessMemory = Math.max(0, memoryGB - balancedMemory);
      memoryRatioPremium = (baseCosts.memoryCost * excessMemory * sizePenalty) * ratioPremiumFactor;
    } else if (vmRatio < naturalRatio) {
      // CPU-heavy: apply premium only to excess CPU
      const balancedCPU = memoryGB / naturalRatio;
      const excessCPU = Math.max(0, vCPUs - balancedCPU);
      cpuRatioPremium = (baseCosts.cpuCost * excessCPU * sizePenalty) * ratioPremiumFactor;
    }
    
    // Final costs
    const cpuCost = cpuSizeCost + cpuRatioPremium;
    const memoryCost = memorySizeCost + memoryRatioPremium;
    
    return cpuCost + memoryCost;
  }

  console.log("Testing Pricing Monotonicity V3 (Strict Excess-Only Premiums)\n");
  console.log("Natural Ratio: 1:4 (CPU:Memory)");
  console.log("==============================================================\n");

  // Quick spot checks
  console.log("Spot Checks:");
  console.log("-------------");
  const spotChecks = [
    { cpu: 4, mem: 16, desc: "4v/16GB (balanced)" },
    { cpu: 3, mem: 16, desc: "3v/16GB" },
    { cpu: 2, mem: 16, desc: "2v/16GB" },
    { cpu: 1, mem: 16, desc: "1v/16GB" },
    { cpu: 4, mem: 8, desc: "4v/8GB" },
    { cpu: 4, mem: 4, desc: "4v/4GB" },
  ];
  
  spotChecks.forEach(({ cpu, mem, desc }) => {
    const price = calculatePrice(cpu, mem);
    console.log(`${desc}: $${price.toFixed(4)}/hr`);
  });

  // Comprehensive monotonicity check
  console.log("\nComprehensive Monotonicity Check");
  console.log("---------------------------------");
  let failedTests = 0;
  let passedTests = 0;
  const failures = [];
  
  // Check CPU monotonicity
  for (let mem = 4; mem <= 64; mem += 4) {
    let prevPrice = Infinity;
    for (let cpu = 16; cpu >= 1; cpu--) {
      const price = calculatePrice(cpu, mem);
      if (price > prevPrice) {
        failedTests++;
        if (failedTests <= 10) {
          failures.push(`CPU: ${cpu+1}→${cpu} @ ${mem}GB: ${prevPrice.toFixed(4)} → ${price.toFixed(4)}`);
        }
      } else {
        passedTests++;
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
        failedTests++;
        if (failedTests <= 20) {
          failures.push(`MEM: ${mem+4}→${mem}GB @ ${cpu}v: ${prevPrice.toFixed(4)} → ${price.toFixed(4)}`);
        }
      } else {
        passedTests++;
      }
      prevPrice = price;
    }
  }
  
  if (failures.length > 0) {
    console.log("First few failures:");
    failures.forEach(f => console.log(`  ❌ ${f}`));
  }
  
  console.log(`\nResults: ${passedTests} passed, ${failedTests} failed`);
  
  if (failedTests === 0) {
    console.log("✅ ALL MONOTONICITY TESTS PASSED!");
  } else {
    console.log(`❌ ${failedTests} monotonicity tests failed`);
  }

  // Test gradient behavior
  console.log("\nGradient Test (should decrease smoothly):");
  console.log("------------------------------------------");
  console.log("Reducing CPU (16GB fixed):");
  for (let cpu = 8; cpu >= 1; cpu--) {
    const price = calculatePrice(cpu, 16);
    console.log(`  ${cpu}v: $${price.toFixed(4)}`);
  }
  
  console.log("\nReducing Memory (4v fixed):");
  for (let mem = 32; mem >= 4; mem -= 4) {
    const price = calculatePrice(4, mem);
    console.log(`  ${mem}GB: $${price.toFixed(4)}`);
  }
}

testMonotonicityV3();