import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PowerCalculationResult, PowerCalculationInputs } from './powerCalculations';
import { PowerCalibrationProfile, DEFAULT_CALIBRATION_PROFILE } from './powerCalibration';

interface PowerConsumptionChartProps {
  result: PowerCalculationResult;
  inputs: PowerCalculationInputs;
  calibrationProfile: PowerCalibrationProfile | null;
}

export const PowerConsumptionChart: React.FC<PowerConsumptionChartProps> = ({ result, inputs, calibrationProfile }) => {
  const calibration = calibrationProfile || (DEFAULT_CALIBRATION_PROFILE as PowerCalibrationProfile);
  // Function to calculate PSU efficiency based on load
  const calculateEfficiency = (dcPower: number): number => {
    const loadPercentage = dcPower / inputs.psuRating;
    const loadPercent = loadPercentage * 100;
    
    // Check for calibration overrides
    if (calibration.psuEfficiencyOverrides && calibration.psuEfficiencyOverrides[inputs.psuEfficiencyRating]) {
      const overrides = calibration.psuEfficiencyOverrides[inputs.psuEfficiencyRating];
      
      if (loadPercent >= 0 && loadPercent <= 20 && overrides['0-20']) {
        return overrides['0-20'] * 100;
      } else if (loadPercent > 20 && loadPercent <= 80 && overrides['20-80']) {
        return overrides['20-80'] * 100;
      } else if (loadPercent > 80 && loadPercent <= 100 && overrides['80-100']) {
        return overrides['80-100'] * 100;
      }
    }
    
    // Default efficiency curves - must match powerCalculations.ts PSU_EFFICIENCY
    const defaultEfficiency = {
      '80Plus': loadPercentage < 0.2 ? 0.75 : loadPercentage > 0.8 ? 0.78 : 0.80,
      '80PlusBronze': loadPercentage < 0.2 ? 0.78 : loadPercentage > 0.8 ? 0.81 : 0.85,
      '80PlusSilver': loadPercentage < 0.2 ? 0.80 : loadPercentage > 0.8 ? 0.85 : 0.88,
      '80PlusGold': loadPercentage < 0.2 ? 0.82 : loadPercentage > 0.8 ? 0.87 : 0.90,
      '80PlusPlatinum': loadPercentage < 0.2 ? 0.85 : loadPercentage > 0.8 ? 0.89 : 0.92,
      '80PlusTitanium': loadPercentage < 0.2 ? 0.90 : loadPercentage > 0.8 ? 0.91 : 0.96
    };
    
    return (defaultEfficiency[inputs.psuEfficiencyRating] || 0.85) * 100;
  };
  
  // Generate utilization curve data
  const data = [];
  for (let utilization = 0; utilization <= 100; utilization += 10) {
    const u = utilization / 100;
    // Apply non-linear scaling formula from the algorithm
    const { linear, quadratic, cubic } = calibration.cpuDynamicCoefficients;
    const scalingFactor = linear * u + quadratic * Math.pow(u, 2) + cubic * Math.pow(u, 3);
    const dcPower = result.dcTotalW.idle + (result.dcTotalW.peak - result.dcTotalW.idle) * scalingFactor;
    const efficiency = calculateEfficiency(dcPower);
    
    // Apply redundant PSU factor if enabled
    const efficiencyMultiplier = inputs.redundantPsu ? calibration.redundantPsuEfficiencyBonus : 1.0;
    
    // Calculate AC power from DC power and efficiency
    const acPower = dcPower / (efficiency / 100 * efficiencyMultiplier);
    
    data.push({
      utilization,
      dcPower: Math.round(dcPower),
      acPower: Math.round(acPower),
      efficiency: Math.round(efficiency * 10) / 10 // Round to 1 decimal
    });
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Power Consumption vs Utilization</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="utilization" 
              label={{ value: 'CPU Utilization (%)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              yAxisId="power" 
              label={{ value: 'Power (W)', angle: -90, position: 'insideLeft' }} 
            />
            <YAxis 
              yAxisId="efficiency" 
              orientation="right" 
              label={{ value: 'PSU Efficiency (%)', angle: 90, position: 'insideRight' }} 
              domain={[70, 100]}
            />
            <Tooltip />
            <Legend />
            <Line 
              yAxisId="power"
              type="monotone" 
              dataKey="dcPower" 
              stroke="#3b82f6" 
              name="DC Power" 
              strokeWidth={2}
            />
            <Line 
              yAxisId="power"
              type="monotone" 
              dataKey="acPower" 
              stroke="#8b5cf6" 
              name="AC Power" 
              strokeWidth={2}
            />
            <Line 
              yAxisId="efficiency"
              type="monotone" 
              dataKey="efficiency" 
              stroke="#10b981" 
              name="PSU Efficiency" 
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};