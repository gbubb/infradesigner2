# Peak Power Calculation Analysis

## Issue Summary
The peak power calculation appears to be substantially higher than expected and doesn't align with the component breakdown values shown in the power breakdown table.

## Power Calculation Flow

### 1. Component Power Calculations

#### CPU Power (line 95-120)
```typescript
const peakPower = totalTdp * multipliers.peak;
```
- Peak multiplier for Intel Xeon: **1.35x** of TDP
- Peak multiplier for AMD EPYC: **1.2x** of TDP
- Default: **1.3x** of TDP

#### Memory Power (line 122-166)
- Peak power is calculated based on chip count and power per chip
- No explicit peak multiplier, but uses activity multipliers (peak = 1.0)

#### Storage Power (line 168-213)
- HDDs: Peak multiplier = **1.2x** (line 183)
- SATA SSDs: Peak multiplier = **1.5x** (line 192)
- NVMe SSDs: Peak multiplier = **1.8x** (line 202)

#### Network Power (line 215-227)
- Peak multiplier = **1.1x** (line 225)

#### Fans Power (line 311-316)
- Peak fan power = DC power × **0.15** (15% of total DC power)

### 2. Power Aggregation Steps

1. **Component Sum** (line 307):
   ```
   DC Total = CPU + Memory + Storage + Network + Motherboard + Fans
   ```

2. **Environmental Factor** (line 325):
   ```
   DC with Env = DC Total × (1 + 0.004 × (InletTemp - 20°C))
   ```
   - Adds 0.4% per degree above 20°C

3. **PSU Efficiency Conversion** (line 346-350):
   ```
   AC Total = DC with Env / (PSU Efficiency × Redundancy Bonus)
   ```
   - PSU efficiency varies by load (typically 0.85-0.92 for 80Plus Gold)
   - Redundancy bonus = 0.98 if redundant PSUs

4. **Safety Margin** (line 353-358):
   ```
   AC with Safety = AC Total × 1.15  (for average and peak only)
   ```
   - Adds **15%** safety margin to average and peak power
   - NO safety margin applied to idle power

## Key Multipliers That Inflate Peak Power

### Direct Multipliers:
1. **CPU Peak**: 1.2x - 1.35x of TDP
2. **Storage Peak**: 1.2x - 1.8x of average
3. **Fan Power**: 15% of total DC power at peak
4. **Environmental**: ~1.04x at 30°C inlet temp
5. **PSU Efficiency**: ~1.11x (assuming 90% efficiency)
6. **Safety Margin**: 1.15x

### Compound Effect:
The total multiplication factor can be approximately:
```
CPU: 1.35 × 1.04 × 1.11 × 1.15 = 1.79x
Storage (NVMe): 1.8 × 1.04 × 1.11 × 1.15 = 2.39x
```

## Potential Issues Identified

1. **Fan Power Scaling**: Fans add 15% at peak, which is calculated on the already-elevated DC power
2. **Safety Margin**: The 15% safety margin is applied to the peak power, further inflating it
3. **Compound Multipliers**: Each stage multiplies the previous result, creating a compound effect
4. **Peak Definition**: The CPU peak multiplier (1.35x) might already include safety margins

## Recommendations

1. **Review CPU Peak Multiplier**: The 1.35x multiplier for Intel Xeon seems high if TDP already represents peak thermal design
2. **Consider Safety Margin Policy**: The 15% safety margin on peak power may be redundant if component peaks already include margins
3. **Fan Power at Peak**: 15% fan power at peak load might be excessive for modern servers
4. **Validate Against Real Data**: Compare calculated values with actual measured server power consumption

## Example Calculation Trace

For a server with:
- CPU: 200W TDP
- Memory: 50W
- Storage: 30W
- Network: 20W
- Motherboard: 45W

Peak calculation:
1. CPU Peak: 200W × 1.35 = 270W
2. Memory Peak: 50W
3. Storage Peak: 30W × 1.5 = 45W
4. Network Peak: 20W × 1.1 = 22W
5. Motherboard: 45W
6. DC before fans: 432W
7. Fans: 432W × 0.15 = 65W
8. DC Total: 497W
9. Environmental (25°C): 497W × 1.02 = 507W
10. AC (90% eff): 507W / 0.9 = 563W
11. With Safety: 563W × 1.15 = **647W**

This shows how a ~345W base load becomes 647W peak - nearly double.