import React from 'react';
import { Label } from '@/components/ui/label';
import { PowerCalibrationProfile } from '../PowerCalibrationTypes';
import { CalibrationInputField } from '../shared/CalibrationInputField';

interface NetworkCalibrationTabProps {
  profile: PowerCalibrationProfile;
  updateNestedValue: (path: string[], value: any) => void;
}

export const NetworkCalibrationTab: React.FC<NetworkCalibrationTabProps> = ({
  profile,
  updateNestedValue
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">Power by Speed (W)</Label>
        <div className="grid grid-cols-2 gap-4">
          <CalibrationInputField
            label="1 Gbps"
            value={profile.networkPowerBySpeed[1]}
            onChange={(value) => updateNestedValue(['networkPowerBySpeed', '1'], value)}
            step={1}
            defaultValue="4W"
            unit="W"
          />
          <CalibrationInputField
            label="10 Gbps"
            value={profile.networkPowerBySpeed[10]}
            onChange={(value) => updateNestedValue(['networkPowerBySpeed', '10'], value)}
            step={1}
            defaultValue="10W"
            unit="W"
          />
          <CalibrationInputField
            label="25 Gbps"
            value={profile.networkPowerBySpeed[25]}
            onChange={(value) => updateNestedValue(['networkPowerBySpeed', '25'], value)}
            step={1}
            defaultValue="8W"
            unit="W"
          />
          <CalibrationInputField
            label="40 Gbps"
            value={profile.networkPowerBySpeed[40]}
            onChange={(value) => updateNestedValue(['networkPowerBySpeed', '40'], value)}
            step={1}
            defaultValue="15W"
            unit="W"
          />
          <CalibrationInputField
            label="100 Gbps"
            value={profile.networkPowerBySpeed[100]}
            onChange={(value) => updateNestedValue(['networkPowerBySpeed', '100'], value)}
            step={1}
            defaultValue="20W"
            unit="W"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">Activity Factors</Label>
        <div className="grid grid-cols-2 gap-4">
          <CalibrationInputField
            label="Idle Factor"
            value={profile.networkActivityFactors.idle}
            onChange={(value) => updateNestedValue(['networkActivityFactors', 'idle'], value)}
            defaultValue="0.9 (90%)"
          />
          <CalibrationInputField
            label="Peak Factor"
            value={profile.networkActivityFactors.peak}
            onChange={(value) => updateNestedValue(['networkActivityFactors', 'peak'], value)}
            defaultValue="1.1 (110%)"
          />
        </div>
      </div>
    </div>
  );
};