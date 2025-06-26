import { useState, useMemo, useEffect } from 'react';
import { PowerCalculationInputs, PowerCalculationResult } from '@/components/model/power/powerCalculations';
import { PowerCalibrationProfile } from '@/components/model/power/powerCalibration';
import { Server, NetworkPortType } from '@/types/infrastructure/server-types';
import { StorageDevice, NetworkPort, PowerState } from '@/components/model/power-prediction/types';

// Helper function to map NetworkPortType to speed in Gbps
const getNetworkPortSpeed = (portType: NetworkPortType): 1 | 10 | 25 | 40 | 100 => {
  switch (portType) {
    case NetworkPortType.RJ45:
      return 1; // Typically 1GbE, though can be 10GbE
    case NetworkPortType.SFP:
      return 1; // 1GbE
    case NetworkPortType.SFPlus:
      return 10; // 10GbE
    case NetworkPortType.QSFP:
      return 40; // 40GbE
    case NetworkPortType.QSFPPlus:
      return 40; // 40GbE (can also be 100GbE with breakout)
    case NetworkPortType.QSFPPlusPlusDD:
      return 100; // 100GbE or higher
    default:
      return 1;
  }
};

export const usePowerPredictionState = (servers: Server[]) => {
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [customInputs, setCustomInputs] = useState<Partial<PowerCalculationInputs>>({
    cpuUtilization: 50,
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
  
  // Initialize network ports and reset relevant customInputs when server changes
  useEffect(() => {
    if (selectedServer) {
      // Reset server-specific custom inputs to let server values take precedence
      setCustomInputs(current => ({
        ...current,
        // Remove any CPU/Memory overrides to use server defaults
        baseFrequencyGHz: undefined,
        tdpPerCpu: undefined,
        turboEnabled: undefined,
        memoryType: undefined,
        memorySpeedMHz: undefined,
        dimmCount: undefined,
        dimmCapacityGB: undefined,
        psuRating: undefined,
      }));
      
      // Initialize network ports based on server configuration
      if (selectedServer.networkPortType && selectedServer.portsConsumedQuantity > 0) {
        const defaultPort: NetworkPort = {
          id: '1',
          count: selectedServer.portsConsumedQuantity,
          speedGbps: getNetworkPortSpeed(selectedServer.networkPortType)
        };
        setNetworkPorts([defaultPort]);
      } else {
        setNetworkPorts([]);
      }
      
      // Clear any previous calculation results
      setCalculationResult(null);
    }
  }, [selectedServerId]); // Trigger when selectedServerId changes
  
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