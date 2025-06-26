import { useMemo, useCallback } from 'react';
import { PowerCalculationInputs, PowerCalculationResult, calculateServerPower } from '@/components/model/power/powerCalculations';
import { PowerCalibrationProfile } from '@/components/model/power/powerCalibration';
import { Server, PSUEfficiencyRating } from '@/types/infrastructure/server-types';
import { StorageDevice, NetworkPort } from '@/components/model/power-prediction/types';

// Map PSUEfficiencyRating enum to PowerCalculationInputs format
const mapPSUEfficiencyRating = (rating: PSUEfficiencyRating | undefined): PowerCalculationInputs['psuEfficiencyRating'] => {
  if (!rating) return '80PlusGold'; // Default
  
  const mappings: Record<PSUEfficiencyRating, PowerCalculationInputs['psuEfficiencyRating']> = {
    [PSUEfficiencyRating.Standard]: '80Plus',
    [PSUEfficiencyRating.Bronze]: '80PlusBronze',
    [PSUEfficiencyRating.Silver]: '80PlusSilver',
    [PSUEfficiencyRating.Gold]: '80PlusGold',
    [PSUEfficiencyRating.Platinum]: '80PlusPlatinum',
    [PSUEfficiencyRating.Titanium]: '80PlusTitanium',
  };
  
  return mappings[rating] || '80PlusGold';
};

export const usePowerCalculation = (
  selectedServer: Server | undefined,
  customInputs: Partial<PowerCalculationInputs>,
  storageDevices: StorageDevice[],
  networkPorts: NetworkPort[],
  calibrationProfile: PowerCalibrationProfile | null,
  setCalculationResult: (result: PowerCalculationResult | null) => void
) => {
  const powerInputs = useMemo((): PowerCalculationInputs | null => {
    if (!selectedServer) return null;
    
    // Parse storage from devices
    const hdds: PowerCalculationInputs['hdds'] = [];
    const ssdSata: PowerCalculationInputs['ssdSata'] = [];
    const nvme: PowerCalculationInputs['nvme'] = [];
    
    storageDevices.forEach(device => {
      if (device.type === 'HDD') {
        hdds.push({
          count: device.count,
          capacityTB: device.capacityTB,
          rpm: device.rpm || 7200
        });
      } else if (device.type === 'SSD_SATA') {
        ssdSata.push({
          count: device.count,
          capacityTB: device.capacityTB
        });
      } else if (device.type === 'NVMe') {
        nvme.push({
          count: device.count,
          capacityTB: device.capacityTB,
          generation: device.generation || 4
        });
      }
    });
    
    // Parse network ports
    const networkPortsArray: PowerCalculationInputs['networkPorts'] = networkPorts.map(port => ({
      count: port.count,
      speedGbps: port.speedGbps
    }));
    
    return {
      // CPU from server - now using actual component fields
      cpuModel: selectedServer.cpuModel || 'Unknown',
      cpuCount: selectedServer.cpuSockets || 1,
      coresPerCpu: selectedServer.cpuCoresPerSocket || selectedServer.coreCount || 16,
      baseFrequencyGHz: customInputs.baseFrequencyGHz || selectedServer.cpuFrequencyBaseGhz || 2.4,
      tdpPerCpu: customInputs.tdpPerCpu || selectedServer.cpuTdpWatts || 150,
      turboEnabled: customInputs.turboEnabled !== undefined ? customInputs.turboEnabled : 
                    (selectedServer.cpuFrequencyTurboGhz ? selectedServer.cpuFrequencyTurboGhz > (selectedServer.cpuFrequencyBaseGhz || 0) : false),
      cpuUtilization: customInputs.cpuUtilization || 50,
      
      // Memory from server - using new detailed fields
      memoryType: customInputs.memoryType || selectedServer.memoryType || 'DDR4',
      dimmCount: customInputs.dimmCount || selectedServer.memoryDimmSlotsConsumed || 
                 Math.ceil((selectedServer.memoryCapacity || 128) / (selectedServer.memoryDimmSize || 32)),
      dimmCapacityGB: customInputs.dimmCapacityGB || selectedServer.memoryDimmSize || 32,
      memorySpeedMHz: customInputs.memorySpeedMHz || selectedServer.memoryDimmFrequencyMhz || 2933,
      
      // Storage
      hdds,
      ssdSata,
      nvme,
      raidController: customInputs.raidController || false,
      
      // Network
      networkPorts: networkPortsArray,
      
      // PSU - Use server component PSU data if available
      psuRating: customInputs.psuRating || selectedServer.psuRatingWatts || 
                 (selectedServer.power ? selectedServer.power * 1.5 : 750),
      psuEfficiencyRating: customInputs.psuEfficiencyRating || 
                           mapPSUEfficiencyRating(selectedServer.psuEfficiency),
      redundantPsu: customInputs.redundantPsu !== undefined ? customInputs.redundantPsu : 
                    (selectedServer.psuQuantity ? selectedServer.psuQuantity > 1 : true),
      
      // Environmental
      inletTempC: customInputs.inletTempC || 25,
      formFactor: (selectedServer.ruSize === 1 ? '1U' : selectedServer.ruSize === 2 ? '2U' : '4U') as '1U' | '2U' | '4U'
    };
  }, [selectedServer, customInputs, storageDevices, networkPorts]);
  
  const handleCalculate = useCallback(() => {
    if (!powerInputs) return;
    const result = calculateServerPower(powerInputs, calibrationProfile || undefined);
    setCalculationResult(result);
  }, [powerInputs, calibrationProfile, setCalculationResult]);
  
  const handleCalibrationChange = useCallback((profile: PowerCalibrationProfile | null) => {
    // Recalculate if we already have results
    if (powerInputs) {
      const result = calculateServerPower(powerInputs, profile || undefined);
      setCalculationResult(result);
    }
  }, [powerInputs, setCalculationResult]);
  
  return {
    powerInputs,
    handleCalculate,
    handleCalibrationChange
  };
};