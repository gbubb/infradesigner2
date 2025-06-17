import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PowerCalibrationProfile } from '../PowerCalibrationTypes';
import { CalibrationInputField } from '../shared/CalibrationInputField';
import { DEFAULT_CALIBRATION_PROFILE } from '../PowerCalibrationConstants';

interface SystemCalibrationTabProps {
  profile: PowerCalibrationProfile;
  updateProfile: (updates: Partial<PowerCalibrationProfile>) => void;
  updateNestedValue: (path: string[], value: number) => void;
}

export const SystemCalibrationTab: React.FC<SystemCalibrationTabProps> = ({
  profile,
  updateProfile,
  updateNestedValue
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <CalibrationInputField
          label="BMC Power"
          value={profile.bmcPower}
          onChange={(value) => updateProfile({ bmcPower: value })}
          step={1}
          defaultValue="6W"
          unit="W"
        />
        <CalibrationInputField
          label="Safety Margin"
          value={profile.safetyMarginPercent}
          onChange={(value) => updateProfile({ safetyMarginPercent: value })}
          step={1}
          defaultValue="15%"
          unit="%"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <CalibrationInputField
          label="Temperature Coefficient per °C"
          value={profile.tempCoefficientPerDegree}
          onChange={(value) => updateProfile({ tempCoefficientPerDegree: value })}
          step={0.001}
          defaultValue="0.004"
        />
        <CalibrationInputField
          label="Temperature Baseline"
          value={profile.tempBaselineC}
          onChange={(value) => updateProfile({ tempBaselineC: value })}
          step={1}
          defaultValue="20°C"
          unit="°C"
        />
      </div>
      
      <div>
        <Label className="mb-2 block">Motherboard Base Power by Form Factor</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="1U"
            value={profile.motherboardBasePower['1U']}
            onChange={(value) => updateNestedValue(['motherboardBasePower', '1U'], value)}
            step={1}
            defaultValue="30W"
            unit="W"
          />
          <CalibrationInputField
            label="2U"
            value={profile.motherboardBasePower['2U']}
            onChange={(value) => updateNestedValue(['motherboardBasePower', '2U'], value)}
            step={1}
            defaultValue="45W"
            unit="W"
          />
          <CalibrationInputField
            label="4U"
            value={profile.motherboardBasePower['4U']}
            onChange={(value) => updateNestedValue(['motherboardBasePower', '4U'], value)}
            step={1}
            defaultValue="60W"
            unit="W"
          />
        </div>
      </div>
      
      <div>
        <Label className="mb-2 block">Fan Power Factors (% of Total DC)</Label>
        <div className="grid grid-cols-3 gap-4">
          <CalibrationInputField
            label="Idle"
            value={profile.fanPowerFactors.idle}
            onChange={(value) => updateNestedValue(['fanPowerFactors', 'idle'], value)}
            defaultValue="0.05 (5%)"
          />
          <CalibrationInputField
            label="Average"
            value={profile.fanPowerFactors.average}
            onChange={(value) => updateNestedValue(['fanPowerFactors', 'average'], value)}
            defaultValue="0.10 (10%)"
          />
          <CalibrationInputField
            label="Peak"
            value={profile.fanPowerFactors.peak}
            onChange={(value) => updateNestedValue(['fanPowerFactors', 'peak'], value)}
            defaultValue="0.15 (15%)"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">PSU Efficiency Settings</Label>
          <div className="grid grid-cols-2 gap-4">
            <CalibrationInputField
              label="Redundant PSU Efficiency Bonus"
              value={profile.redundantPsuEfficiencyBonus}
              onChange={(value) => updateProfile({ redundantPsuEfficiencyBonus: value })}
              defaultValue="0.98 (2% improvement)"
            />
          </div>
        </div>
        
        <Accordion type="single" collapsible>
          <AccordionItem value="psu-curves">
            <AccordionTrigger>PSU Efficiency Curve Overrides</AccordionTrigger>
            <AccordionContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Override default PSU efficiency curves by load range. Format: "min-max": efficiency
                  <br />Example: "0-20": 0.75 means 75% efficiency at 0-20% load
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                {['80Plus', '80PlusBronze', '80PlusSilver', '80PlusGold', '80PlusPlatinum', '80PlusTitanium'].map(rating => (
                  <div key={rating}>
                    <Label className="text-sm font-medium mb-2 block">{rating}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">0-20% Load</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={profile.psuEfficiencyOverrides?.[rating]?.['0-20'] || DEFAULT_CALIBRATION_PROFILE.psuEfficiencyOverrides![rating]['0-20']}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : undefined;
                            const overrides = { ...profile.psuEfficiencyOverrides };
                            if (!overrides[rating]) overrides[rating] = {};
                            if (value !== undefined) {
                              overrides[rating]['0-20'] = value;
                            } else {
                              delete overrides[rating]['0-20'];
                            }
                            updateProfile({ psuEfficiencyOverrides: overrides });
                          }}
                          placeholder={DEFAULT_CALIBRATION_PROFILE.psuEfficiencyOverrides![rating]['0-20'].toString()}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">20-80% Load</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={profile.psuEfficiencyOverrides?.[rating]?.['20-80'] || DEFAULT_CALIBRATION_PROFILE.psuEfficiencyOverrides![rating]['20-80']}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : undefined;
                            const overrides = { ...profile.psuEfficiencyOverrides };
                            if (!overrides[rating]) overrides[rating] = {};
                            if (value !== undefined) {
                              overrides[rating]['20-80'] = value;
                            } else {
                              delete overrides[rating]['20-80'];
                            }
                            updateProfile({ psuEfficiencyOverrides: overrides });
                          }}
                          placeholder={DEFAULT_CALIBRATION_PROFILE.psuEfficiencyOverrides![rating]['20-80'].toString()}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">80-100% Load</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={profile.psuEfficiencyOverrides?.[rating]?.['80-100'] || DEFAULT_CALIBRATION_PROFILE.psuEfficiencyOverrides![rating]['80-100']}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : undefined;
                            const overrides = { ...profile.psuEfficiencyOverrides };
                            if (!overrides[rating]) overrides[rating] = {};
                            if (value !== undefined) {
                              overrides[rating]['80-100'] = value;
                            } else {
                              delete overrides[rating]['80-100'];
                            }
                            updateProfile({ psuEfficiencyOverrides: overrides });
                          }}
                          placeholder={DEFAULT_CALIBRATION_PROFILE.psuEfficiencyOverrides![rating]['80-100'].toString()}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};