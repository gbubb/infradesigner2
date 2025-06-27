import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { PowerCalculationInputs } from './powerCalculations';
import { PowerCalibrationProfile, DEFAULT_CALIBRATION_PROFILE } from './powerCalibration';

interface PowerCalculationParametersProps {
  inputs: PowerCalculationInputs;
  calibrationProfile: PowerCalibrationProfile | null;
}

export const PowerCalculationParameters: React.FC<PowerCalculationParametersProps> = ({ 
  inputs, 
  calibrationProfile 
}) => {
  // Use calibration profile if available, otherwise use defaults
  const defaultProfile = {
    ...DEFAULT_CALIBRATION_PROFILE,
    id: 'default',
    createdAt: new Date(),
    updatedAt: new Date()
  } as PowerCalibrationProfile;
  
  const params = calibrationProfile || defaultProfile;
  const isUsingCalibration = !!calibrationProfile;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Calculation Parameters</span>
          <Badge variant={isUsingCalibration ? "default" : "outline"}>
            {isUsingCalibration ? `Profile: ${calibrationProfile.name}` : 'Default Parameters'}
          </Badge>
        </CardTitle>
        <CardDescription>
          These parameters were used to calculate the power consumption values
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {/* Input Configuration */}
          <AccordionItem value="inputs">
            <AccordionTrigger>Input Configuration</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">CPU Configuration</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Model:</span> {inputs.cpuModel}</div>
                    <div><span className="text-muted-foreground">Count:</span> {inputs.cpuCount}</div>
                    <div><span className="text-muted-foreground">Cores per CPU:</span> {inputs.coresPerCpu}</div>
                    <div><span className="text-muted-foreground">Base Frequency:</span> {inputs.baseFrequencyGHz} GHz</div>
                    <div><span className="text-muted-foreground">TDP per CPU:</span> {inputs.tdpPerCpu}W</div>
                    <div><span className="text-muted-foreground">Utilization:</span> {inputs.cpuUtilization}%</div>
                    <div><span className="text-muted-foreground">Turbo Enabled:</span> {inputs.turboEnabled ? 'Yes' : 'No'}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Memory Configuration</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Type:</span> {inputs.memoryType}</div>
                    <div><span className="text-muted-foreground">DIMM Count:</span> {inputs.dimmCount}</div>
                    <div><span className="text-muted-foreground">DIMM Capacity:</span> {inputs.dimmCapacityGB}GB</div>
                    <div><span className="text-muted-foreground">Speed:</span> {inputs.memorySpeedMHz} MHz</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Storage Configuration</h4>
                  <div className="space-y-1 text-sm">
                    {inputs.hdds.length > 0 && (
                      <div>HDDs: {inputs.hdds.map(h => `${h.count}x ${h.capacityTB}TB @ ${h.rpm}RPM`).join(', ')}</div>
                    )}
                    {inputs.ssdSata.length > 0 && (
                      <div>SATA SSDs: {inputs.ssdSata.map(s => `${s.count}x ${s.capacityTB}TB`).join(', ')}</div>
                    )}
                    {inputs.nvme.length > 0 && (
                      <div>NVMe: {inputs.nvme.map(n => `${n.count}x ${n.capacityTB}TB Gen${n.generation}`).join(', ')}</div>
                    )}
                    <div><span className="text-muted-foreground">RAID Controller:</span> {inputs.raidController ? 'Yes' : 'No'}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Other Configuration</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Form Factor:</span> {inputs.formFactor}</div>
                    <div><span className="text-muted-foreground">Inlet Temp:</span> {inputs.inletTempC}°C</div>
                    <div><span className="text-muted-foreground">PSU Rating:</span> {inputs.psuRating}W</div>
                    <div><span className="text-muted-foreground">PSU Efficiency:</span> {inputs.psuEfficiencyRating}</div>
                    <div><span className="text-muted-foreground">Redundant PSU:</span> {inputs.redundantPsu ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* CPU Parameters */}
          <AccordionItem value="cpu-params">
            <AccordionTrigger>CPU Calculation Parameters</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Idle Power:</span> {(params.cpuIdleMultiplier * 100).toFixed(0)}% of TDP</div>
                  <div><span className="text-muted-foreground">Turbo Multiplier:</span> {(params.cpuTurboMultiplier * 100).toFixed(0)}% above TDP</div>
                  <div><span className="text-muted-foreground">Turbo Probability:</span> {(params.cpuTurboProbability * 100).toFixed(0)}%</div>
                  <div><span className="text-muted-foreground">Multicore Efficiency Base:</span> {params.cpuMulticoreEfficiencyBase}</div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-1">Dynamic Power Coefficients</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">Linear (u):</span> {params.cpuDynamicCoefficients.linear}</div>
                    <div><span className="text-muted-foreground">Quadratic (u²):</span> {params.cpuDynamicCoefficients.quadratic}</div>
                    <div><span className="text-muted-foreground">Cubic (u³):</span> {params.cpuDynamicCoefficients.cubic}</div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-1">Architecture Multipliers</h5>
                  <div className="space-y-1">
                    {Object.entries(params.cpuArchitectureMultipliers).map(([arch, mult]) => (
                      <div key={arch} className="grid grid-cols-3 gap-2">
                        <div className="text-muted-foreground">{arch}:</div>
                        <div>Idle: {mult.idle}</div>
                        <div>Peak: {mult.peak}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Memory Parameters */}
          <AccordionItem value="memory-params">
            <AccordionTrigger>Memory Calculation Parameters</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h5 className="font-medium mb-1">Controller Base Power</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">DDR3:</span> {params.memoryPowerModel?.controllerBasePower?.DDR3 ?? 1.2}W</div>
                    <div><span className="text-muted-foreground">DDR4:</span> {params.memoryPowerModel?.controllerBasePower?.DDR4 ?? 1.0}W</div>
                    <div><span className="text-muted-foreground">DDR5:</span> {params.memoryPowerModel?.controllerBasePower?.DDR5 ?? 0.8}W</div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-1">Power per Memory Chip</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">DDR3:</span> {params.memoryPowerModel?.powerPerChip?.DDR3 ?? 0.25}W</div>
                    <div><span className="text-muted-foreground">DDR4:</span> {params.memoryPowerModel?.powerPerChip?.DDR4 ?? 0.18}W</div>
                    <div><span className="text-muted-foreground">DDR5:</span> {params.memoryPowerModel?.powerPerChip?.DDR5 ?? 0.135}W</div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-1">Chips per GB</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">DDR3:</span> {params.memoryPowerModel?.chipsPerGB?.DDR3 ?? 1.0}</div>
                    <div><span className="text-muted-foreground">DDR4:</span> {params.memoryPowerModel?.chipsPerGB?.DDR4 ?? 0.5}</div>
                    <div><span className="text-muted-foreground">DDR5:</span> {params.memoryPowerModel?.chipsPerGB?.DDR5 ?? 0.25}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <div><span className="text-muted-foreground">Speed Scaling Exponent:</span> {params.memoryPowerModel?.speedScaling?.scalingExponent ?? 0.3}</div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-1">Activity Multipliers</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">Idle:</span> {((params.memoryPowerModel?.activityMultipliers?.idle ?? 0.34) * 100).toFixed(0)}%</div>
                    <div><span className="text-muted-foreground">Load:</span> {((params.memoryPowerModel?.activityMultipliers?.average ?? 1.0) * 100).toFixed(0)}%</div>
                    <div><span className="text-muted-foreground">Peak:</span> {((params.memoryPowerModel?.activityMultipliers?.peak ?? 1.0) * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* Storage Parameters */}
          <AccordionItem value="storage-params">
            <AccordionTrigger>Storage Calculation Parameters</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h5 className="font-medium mb-1">Base Power Values</h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-muted-foreground">HDD Base:</span> {params.storageBasePower.hddBase}W</div>
                    <div><span className="text-muted-foreground">HDD per TB:</span> {params.storageBasePower.hddCapacityScaling}W</div>
                    <div><span className="text-muted-foreground">SATA SSD Base:</span> {params.storageBasePower.ssdSataBase}W</div>
                    <div><span className="text-muted-foreground">SATA SSD per TB:</span> {params.storageBasePower.ssdSataCapacityScaling}W</div>
                    <div><span className="text-muted-foreground">NVMe Base:</span> {params.storageBasePower.nvmeBase}W</div>
                    <div><span className="text-muted-foreground">NVMe per Gen:</span> {params.storageBasePower.nvmeGenScaling}W</div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-1">RAID Controller Power</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">Idle:</span> {params.raidControllerPower.idle}W</div>
                    <div><span className="text-muted-foreground">Average:</span> {params.raidControllerPower.average}W</div>
                    <div><span className="text-muted-foreground">Peak:</span> {params.raidControllerPower.peak}W</div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          
          {/* System Parameters */}
          <AccordionItem value="system-params">
            <AccordionTrigger>System & Environmental Parameters</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <div>
                  <h5 className="font-medium mb-1">Motherboard Base Power</h5>
                  <div className="grid grid-cols-3 gap-2">
                    <div><span className="text-muted-foreground">1U:</span> {params.motherboardBasePower['1U']}W</div>
                    <div><span className="text-muted-foreground">2U:</span> {params.motherboardBasePower['2U']}W</div>
                    <div><span className="text-muted-foreground">4U:</span> {params.motherboardBasePower['4U']}W</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">BMC Power:</span> {params.bmcPower}W</div>
                  <div><span className="text-muted-foreground">Safety Margin:</span> {params.safetyMarginPercent}%</div>
                  <div><span className="text-muted-foreground">Temp Coefficient:</span> {params.tempCoefficientPerDegree} per °C</div>
                  <div><span className="text-muted-foreground">Temp Baseline:</span> {params.tempBaselineC}°C</div>
                </div>
                
                <div>
                  <h5 className="font-medium mb-1">Fan Power by Form Factor</h5>
                  <div className="space-y-2">
                    {Object.entries(params.fanPowerByFormFactor).map(([formFactor, power]) => (
                      <div key={formFactor} className="grid grid-cols-4 gap-2">
                        <div className="text-muted-foreground">{formFactor}:</div>
                        <div>Idle: {power.idle}W</div>
                        <div>Peak: {power.peak}W</div>
                        <div>Avg: {Math.round((power.idle + (power.peak - power.idle) * 0.5) * 10) / 10}W</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};