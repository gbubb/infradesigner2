import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { PowerCalibrationProfile } from '../PowerCalibrationTypes';
import { CalibrationInputField } from '../shared/CalibrationInputField';

interface MemoryCalibrationTabProps {
  profile: PowerCalibrationProfile;
  updateProfile: (updates: Partial<PowerCalibrationProfile>) => void;
  updateNestedValue: (path: string[], value: any) => void;
}

export const MemoryCalibrationTab: React.FC<MemoryCalibrationTabProps> = ({
  profile,
  updateProfile,
  updateNestedValue
}) => {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Memory power model uses controller base power + chip count * chip power * activity factor
        </AlertDescription>
      </Alert>
      
      <div>
        <Label className="mb-2 block">Controller Base Power (W)</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="DDR3"
            value={profile.memoryPowerModel?.controllerBasePower?.DDR3 || 1.2}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'controllerBasePower', 'DDR3'], value)}
            defaultValue="1.2W"
          />
          <CalibrationInputField
            label="DDR4"
            value={profile.memoryPowerModel?.controllerBasePower?.DDR4 || 1.0}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'controllerBasePower', 'DDR4'], value)}
            defaultValue="1.0W"
          />
          <CalibrationInputField
            label="DDR5"
            value={profile.memoryPowerModel?.controllerBasePower?.DDR5 || 0.8}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'controllerBasePower', 'DDR5'], value)}
            defaultValue="0.8W"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">Power per Memory Chip (W)</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="DDR3"
            value={profile.memoryPowerModel?.powerPerChip?.DDR3 || 0.25}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'powerPerChip', 'DDR3'], value)}
            defaultValue="0.25W"
          />
          <CalibrationInputField
            label="DDR4"
            value={profile.memoryPowerModel?.powerPerChip?.DDR4 || 0.18}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'powerPerChip', 'DDR4'], value)}
            defaultValue="0.18W"
          />
          <CalibrationInputField
            label="DDR5"
            value={profile.memoryPowerModel?.powerPerChip?.DDR5 || 0.135}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'powerPerChip', 'DDR5'], value)}
            step={0.001}
            defaultValue="0.135W"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">Chips per GB</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="DDR3 (8Gb chips)"
            value={profile.memoryPowerModel?.chipsPerGB?.DDR3 || 1.0}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'chipsPerGB', 'DDR3'], value)}
            step={0.1}
            defaultValue="1.0"
          />
          <CalibrationInputField
            label="DDR4 (16Gb chips)"
            value={profile.memoryPowerModel?.chipsPerGB?.DDR4 || 0.5}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'chipsPerGB', 'DDR4'], value)}
            step={0.1}
            defaultValue="0.5"
          />
          <CalibrationInputField
            label="DDR5 (32Gb chips)"
            value={profile.memoryPowerModel?.chipsPerGB?.DDR5 || 0.25}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'chipsPerGB', 'DDR5'], value)}
            step={0.1}
            defaultValue="0.25"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">Activity Multipliers</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="Idle"
            value={profile.memoryPowerModel?.activityMultipliers?.idle || 0.34}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'activityMultipliers', 'idle'], value)}
            defaultValue="0.34 (34%)"
          />
          <CalibrationInputField
            label="Average/Load"
            value={profile.memoryPowerModel?.activityMultipliers?.average || 1.0}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'activityMultipliers', 'average'], value)}
            defaultValue="1.0 (100%)"
          />
          <CalibrationInputField
            label="Peak"
            value={profile.memoryPowerModel?.activityMultipliers?.peak || 1.0}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'activityMultipliers', 'peak'], value)}
            defaultValue="1.0 (100%)"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">Speed Scaling</Label>
        <div className="grid grid-cols-2 gap-4">
          <CalibrationInputField
            label="Scaling Exponent"
            value={profile.memoryPowerModel?.speedScaling?.scalingExponent || 0.3}
            onChange={(value) => updateNestedValue(['memoryPowerModel', 'speedScaling', 'scalingExponent'], value)}
            defaultValue="0.3 (logarithmic)"
          />
          <CalibrationInputField
            label="Conservative Override"
            value={profile.memoryConservativeMultiplier}
            onChange={(value) => updateProfile({ memoryConservativeMultiplier: value })}
            step={0.5}
            defaultValue="5W"
            unit="W/DIMM"
          />
        </div>
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Example:</strong> 96GB DDR5 @ 4800MHz = 0.8W (controller) + 24 chips × 0.135W = 4.04W peak, 1.37W idle
        </AlertDescription>
      </Alert>
    </div>
  );
};