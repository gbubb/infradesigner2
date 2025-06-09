import { useState, useMemo } from 'react';
import { PowerCalculationInputs, PowerCalculationResult } from '@/components/model/power/powerCalculations';
import { PowerCalibrationProfile } from '@/components/model/power/powerCalibration';
import { Server } from '@/types/infrastructure/server-types';
import { StorageDevice, NetworkPort, PowerState } from '@/components/model/power-prediction/types';

export const usePowerPredictionState = (servers: Server[]) => {
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [customInputs, setCustomInputs] = useState<Partial<PowerCalculationInputs>>({
    cpuUtilization: 50,
    turboEnabled: true,
    memoryType: 'DDR4',
    memorySpeedMHz: 2933,
    raidController: false,
    psuEfficiencyRating: '80PlusGold',
    redundantPsu: true,
    inletTempC: 25,
  });
  
  const [storageDevices, setStorageDevices] = useState<StorageDevice[]>([]);
  const [networkPorts, setNetworkPorts] = useState<NetworkPort[]>([]);
  const [calculationResult, setCalculationResult] = useState<PowerCalculationResult | null>(null);
  const [calibrationProfile, setCalibrationProfile] = useState<PowerCalibrationProfile | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [selectedPowerState, setSelectedPowerState] = useState<PowerState>('average');
  
  const selectedServer = useMemo(() => 
    servers.find(s => s.id === selectedServerId),
    [servers, selectedServerId]
  );
  
  const updateCustomInputs = (updates: Partial<PowerCalculationInputs>) => {
    setCustomInputs(current => ({ ...current, ...updates }));
  };
  
  return {
    // State
    selectedServerId,
    selectedServer,
    customInputs,
    storageDevices,
    networkPorts,
    calculationResult,
    calibrationProfile,
    showCalibration,
    showValidation,
    selectedPowerState,
    
    // State setters
    setSelectedServerId,
    updateCustomInputs,
    setStorageDevices,
    setNetworkPorts,
    setCalculationResult,
    setCalibrationProfile,
    setShowCalibration,
    setShowValidation,
    setSelectedPowerState
  };
};