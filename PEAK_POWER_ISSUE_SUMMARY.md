# Peak Power Calculation Issue - Summary and Solutions

## Problem Summary
The peak power calculation is showing values that are substantially higher than expected, not aligning with the component breakdown shown in the power breakdown table. The issue stems from multiple compounding multipliers applied throughout the calculation pipeline.

## Root Causes Identified

### 1. **Compound Multiplication Effect**
The calculation applies multiple multipliers sequentially, each building on the previous result:

1. **Component-level multipliers**:
   - CPU: 1.35× (Intel Xeon) to 1.2× (AMD EPYC) of TDP
   - Storage: 1.2× (HDD) to 1.8× (NVMe) of average power
   - Network: 1.1× of base power

2. **System-level additions**:
   - Fan power: +15% of total DC power at peak
   - Environmental factor: +0.4% per °C above 20°C

3. **Conversion factors**:
   - PSU efficiency: ÷0.85-0.92 (effectively 1.09-1.18× multiplier)
   - Safety margin: 1.15× (only on average and peak)

### 2. **Example Calculation**
For a typical server configuration:
- Base component peak sum: 345W
- After fans (+15%): 397W
- After environmental (25°C): 405W
- After PSU efficiency (90%): 450W
- After safety margin: **517W** (1.5× original)

With higher temperatures or lower PSU efficiency, this can easily reach 2× the base power.

## Recommended Solutions

### Solution 1: Adjust CPU Peak Multipliers
**File**: `/src/components/model/power-calibration/PowerCalibrationConstants.ts`

The current CPU peak multipliers may be too aggressive:
- Intel Xeon: 1.35× → 1.2×
- AMD EPYC: 1.2× → 1.1×
- Default: 1.3× → 1.15×

### Solution 2: Conditional Safety Margin for Peak Power
**File**: `/src/components/model/power/powerCalculations.ts`

Don't apply the 15% safety margin to peak power calculations since peak already represents worst-case:

```typescript
// Line 353-358
const safetyMargin = 1 + (cal.safetyMarginPercent / 100);
const acWithSafety = {
  idle: acTotal.idle,  // No safety margin for idle
  average: acTotal.average * safetyMargin,
  peak: acTotal.peak  // No safety margin for peak
};
```

### Solution 3: Reduce Fan Power at Peak
**File**: `/src/components/model/power-calibration/PowerCalibrationConstants.ts`

Modern servers have more efficient cooling:
```typescript
fanPowerFactors: {
  idle: 0.05,    // 5% (unchanged)
  average: 0.10,  // 10% (unchanged)
  peak: 0.12      // 12% (reduced from 15%)
}
```

### Solution 4: Add Peak Power Cap Option
Add a maximum peak-to-idle ratio to prevent unrealistic values:

```typescript
// In PowerCalibrationProfile type
maxPeakToIdleRatio?: number;  // e.g., 2.5

// In calculation
if (maxPeakToIdleRatio && result.peak / result.idle > maxPeakToIdleRatio) {
  result.peak = result.idle * maxPeakToIdleRatio;
}
```

## Debug Component Added
I've added a `PowerCalculationDebug` component that shows:
1. Step-by-step calculation breakdown
2. Each multiplier's contribution
3. Total multiplication factor
4. Component-level peak vs idle ratios

This will help users understand why peak power is so high and validate if the calculations are reasonable for their specific hardware.

## Next Steps
1. Review the debug output with actual server configurations
2. Compare calculated values with vendor specifications
3. Implement the recommended solutions based on validation results
4. Consider adding calibration profiles for specific server models with known power characteristics