import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PowerCalibrationProfile } from '../PowerCalibrationTypes';
import { CalibrationInputField } from '../shared/CalibrationInputField';

interface CPUCalibrationTabProps {
  profile: PowerCalibrationProfile;
  updateProfile: (updates: Partial<PowerCalibrationProfile>) => void;
  updateNestedValue: (path: string[], value: any) => void;
}

export const CPUCalibrationTab: React.FC<CPUCalibrationTabProps> = ({
  profile,
  updateProfile,
  updateNestedValue
}) => {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Adjust CPU power calculation parameters. Default values are based on industry research.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-2 gap-4">
        <CalibrationInputField
          label="CPU Idle Multiplier"
          value={profile.cpuIdleMultiplier}
          onChange={(value) => updateProfile({ cpuIdleMultiplier: value })}
          defaultValue="0.15 (15% of TDP)"
          unit="% of TDP"
        />
        <CalibrationInputField
          label="Turbo Boost Multiplier"
          value={profile.cpuTurboMultiplier}
          onChange={(value) => updateProfile({ cpuTurboMultiplier: value })}
          defaultValue="0.3 (30% above TDP)"
        />
        <CalibrationInputField
          label="Turbo Probability"
          value={profile.cpuTurboProbability}
          onChange={(value) => updateProfile({ cpuTurboProbability: value })}
          min={0}
          max={1}
          step={0.1}
          defaultValue="0.5 (50% chance)"
        />
        <CalibrationInputField
          label="Multicore Efficiency Base"
          value={profile.cpuMulticoreEfficiencyBase}
          onChange={(value) => updateProfile({ cpuMulticoreEfficiencyBase: value })}
          defaultValue="0.95"
        />
      </div>
      
      <div>
        <Label className="mb-2 block">Dynamic Power Coefficients (u + u² + u³)</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="Linear (u)"
            value={profile.cpuDynamicCoefficients.linear}
            onChange={(value) => updateNestedValue(['cpuDynamicCoefficients', 'linear'], value)}
            defaultValue="0.4"
          />
          <CalibrationInputField
            label="Quadratic (u²)"
            value={profile.cpuDynamicCoefficients.quadratic}
            onChange={(value) => updateNestedValue(['cpuDynamicCoefficients', 'quadratic'], value)}
            defaultValue="0.5"
          />
          <CalibrationInputField
            label="Cubic (u³)"
            value={profile.cpuDynamicCoefficients.cubic}
            onChange={(value) => updateNestedValue(['cpuDynamicCoefficients', 'cubic'], value)}
            defaultValue="0.1"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <CalibrationInputField
          label="Multicore Efficiency Decay (per core)"
          value={profile.cpuMulticoreEfficiencyDecay}
          onChange={(value) => updateProfile({ cpuMulticoreEfficiencyDecay: value })}
          step={0.001}
          defaultValue="0.001"
        />
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="architecture">
          <AccordionTrigger>Architecture-Specific Multipliers</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {Object.entries(profile.cpuArchitectureMultipliers).map(([arch, multipliers]) => (
                <div key={arch} className="border p-4 rounded-lg">
                  <h4 className="font-medium mb-2">{arch}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <CalibrationInputField
                      label="Idle Multiplier"
                      value={multipliers.idle}
                      onChange={(value) => updateNestedValue(['cpuArchitectureMultipliers', arch, 'idle'], value)}
                    />
                    <CalibrationInputField
                      label="Peak Multiplier"
                      value={multipliers.peak}
                      onChange={(value) => updateNestedValue(['cpuArchitectureMultipliers', arch, 'peak'], value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};