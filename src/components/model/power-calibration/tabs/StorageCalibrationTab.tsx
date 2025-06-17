import React from 'react';
import { Label } from '@/components/ui/label';
import { PowerCalibrationProfile } from '../PowerCalibrationTypes';
import { CalibrationInputField } from '../shared/CalibrationInputField';

interface StorageCalibrationTabProps {
  profile: PowerCalibrationProfile;
  updateProfile: (updates: Partial<PowerCalibrationProfile>) => void;
  updateNestedValue: (path: string[], value: number) => void;
}

export const StorageCalibrationTab: React.FC<StorageCalibrationTabProps> = ({
  profile,
  updateNestedValue
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label className="mb-2 block">HDD Parameters</Label>
        <div className="grid grid-cols-2 gap-4">
          <CalibrationInputField
            label="Base Power"
            value={profile.storageBasePower.hddBase}
            onChange={(value) => updateNestedValue(['storageBasePower', 'hddBase'], value)}
            step={0.5}
            defaultValue="6W"
            unit="W"
          />
          <CalibrationInputField
            label="Power per TB"
            value={profile.storageBasePower.hddCapacityScaling}
            onChange={(value) => updateNestedValue(['storageBasePower', 'hddCapacityScaling'], value)}
            defaultValue="0.25W/TB"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">SSD Parameters</Label>
        <div className="grid grid-cols-2 gap-4">
          <CalibrationInputField
            label="SATA SSD Base"
            value={profile.storageBasePower.ssdSataBase}
            onChange={(value) => updateNestedValue(['storageBasePower', 'ssdSataBase'], value)}
            step={0.5}
            defaultValue="3W"
            unit="W"
          />
          <CalibrationInputField
            label="NVMe Base"
            value={profile.storageBasePower.nvmeBase}
            onChange={(value) => updateNestedValue(['storageBasePower', 'nvmeBase'], value)}
            step={0.5}
            defaultValue="5W"
            unit="W"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">RAID Controller Power</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="Idle"
            value={profile.raidControllerPower.idle}
            onChange={(value) => updateNestedValue(['raidControllerPower', 'idle'], value)}
            step={1}
            defaultValue="15W"
            unit="W"
          />
          <CalibrationInputField
            label="Average"
            value={profile.raidControllerPower.average}
            onChange={(value) => updateNestedValue(['raidControllerPower', 'average'], value)}
            step={1}
            defaultValue="25W"
            unit="W"
          />
          <CalibrationInputField
            label="Peak"
            value={profile.raidControllerPower.peak}
            onChange={(value) => updateNestedValue(['raidControllerPower', 'peak'], value)}
            step={1}
            defaultValue="40W"
            unit="W"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">HDD RPM Penalty</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="7200 RPM"
            value={profile.storageBasePower.hddRpmPenalty.rpm7200}
            onChange={(value) => updateNestedValue(['storageBasePower', 'hddRpmPenalty', 'rpm7200'], value)}
            step={0.5}
            defaultValue="0W"
            unit="W"
          />
          <CalibrationInputField
            label="10000 RPM"
            value={profile.storageBasePower.hddRpmPenalty.rpm10000}
            onChange={(value) => updateNestedValue(['storageBasePower', 'hddRpmPenalty', 'rpm10000'], value)}
            step={0.5}
            defaultValue="1W"
            unit="W"
          />
          <CalibrationInputField
            label="15000 RPM"
            value={profile.storageBasePower.hddRpmPenalty.rpm15000}
            onChange={(value) => updateNestedValue(['storageBasePower', 'hddRpmPenalty', 'rpm15000'], value)}
            step={0.5}
            defaultValue="2W"
            unit="W"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">Capacity Scaling</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="HDD per TB"
            value={profile.storageBasePower.hddCapacityScaling}
            onChange={(value) => updateNestedValue(['storageBasePower', 'hddCapacityScaling'], value)}
            defaultValue="0.25W/TB"
          />
          <CalibrationInputField
            label="SATA SSD per TB"
            value={profile.storageBasePower.ssdSataCapacityScaling}
            onChange={(value) => updateNestedValue(['storageBasePower', 'ssdSataCapacityScaling'], value)}
            defaultValue="0.1W/TB"
          />
          <CalibrationInputField
            label="NVMe per TB"
            value={profile.storageBasePower.nvmeCapacityScaling}
            onChange={(value) => updateNestedValue(['storageBasePower', 'nvmeCapacityScaling'], value)}
            defaultValue="0.2W/TB"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">NVMe Generation Scaling</Label>
        <CalibrationInputField
          label="Power per Generation"
          value={profile.storageBasePower.nvmeGenScaling}
          onChange={(value) => updateNestedValue(['storageBasePower', 'nvmeGenScaling'], value)}
          step={0.5}
          defaultValue="2W"
          unit="W"
        />
      </div>
      
      <div>
        <Label className="mb-2 block">Activity Factors (Idle/Peak)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm mb-1">HDD</Label>
            <div className="grid grid-cols-2 gap-2">
              <CalibrationInputField
                label="Idle"
                value={profile.storageActivityFactors.hddIdle}
                onChange={(value) => updateNestedValue(['storageActivityFactors', 'hddIdle'], value)}
                defaultValue="0.7"
              />
              <CalibrationInputField
                label="Peak"
                value={profile.storageActivityFactors.hddPeak}
                onChange={(value) => updateNestedValue(['storageActivityFactors', 'hddPeak'], value)}
                defaultValue="1.2"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm mb-1">SSD</Label>
            <div className="grid grid-cols-2 gap-2">
              <CalibrationInputField
                label="Idle"
                value={profile.storageActivityFactors.ssdIdle}
                onChange={(value) => updateNestedValue(['storageActivityFactors', 'ssdIdle'], value)}
                defaultValue="0.5"
              />
              <CalibrationInputField
                label="Peak"
                value={profile.storageActivityFactors.ssdPeak}
                onChange={(value) => updateNestedValue(['storageActivityFactors', 'ssdPeak'], value)}
                defaultValue="1.5"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm mb-1">NVMe</Label>
            <div className="grid grid-cols-2 gap-2">
              <CalibrationInputField
                label="Idle"
                value={profile.storageActivityFactors.nvmeIdle}
                onChange={(value) => updateNestedValue(['storageActivityFactors', 'nvmeIdle'], value)}
                defaultValue="0.3"
              />
              <CalibrationInputField
                label="Peak"
                value={profile.storageActivityFactors.nvmePeak}
                onChange={(value) => updateNestedValue(['storageActivityFactors', 'nvmePeak'], value)}
                defaultValue="1.8"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};