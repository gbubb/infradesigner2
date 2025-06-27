
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
    
    try {
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
      
      // Calculate default values with proper fallbacks
      const cpuSockets = selectedServer.cpuSockets || 1;
      const coresPerSocket = selectedServer.cpuCoresPerSocket || selectedServer.coreCount || 16;
      const memoryCapacity = selectedServer.memoryCapacity || 128;
      const dimmSize = selectedServer.memoryDimmSize || 32;
      const dimmCount = selectedServer.memoryDimmSlotsConsumed || Math.ceil(memoryCapacity / dimmSize);
      
      return {
        // CPU from server - now using actual component fields
        cpuModel: selectedServer.cpuModel || 'Unknown',
        cpuCount: cpuSockets,
        coresPerCpu: coresPerSocket,
        baseFrequencyGHz: customInputs.baseFrequencyGHz || selectedServer.cpuFrequencyBaseGhz || 2.4,
        tdpPerCpu: customInputs.tdpPerCpu || selectedServer.cpuTdpWatts || 150,
        turboEnabled: customInputs.turboEnabled !== undefined ? customInputs.turboEnabled : 
                      (selectedServer.cpuFrequencyTurboGhz ? selectedServer.cpuFrequencyTurboGhz > (selectedServer.cpuFrequencyBaseGhz || 0) : false),
        cpuUtilization: Math.max(0, Math.min(100, customInputs.cpuUtilization || 50)),
        
        // Memory from server - using new detailed fields
        memoryType: customInputs.memoryType || selectedServer.memoryType || 'DDR4',
        dimmCount: Math.max(1, customInputs.dimmCount || dimmCount),
        dimmCapacityGB: Math.max(1, customInputs.dimmCapacityGB || dimmSize),
        memorySpeedMHz: Math.max(1000, customInputs.memorySpeedMHz || selectedServer.memoryDimmFrequencyMhz || 2933),
        
        // Storage
        hdds,
        ssdSata,
        nvme,
        raidController: customInputs.raidController || false,
        
        // Network
        networkPorts: networkPortsArray,
        
        // PSU - Use server component PSU data if available
        psuRating: Math.max(100, customInputs.psuRating || selectedServer.psuRatingWatts || 
                   (selectedServer.power ? selectedServer.power * 1.5 : 750)),
        psuEfficiencyRating: customInputs.psuEfficiencyRating || 
                             mapPSUEfficiencyRating(selectedServer.psuEfficiency),
        redundantPsu: customInputs.redundantPsu !== undefined ? customInputs.redundantPsu : 
                      (selectedServer.psuQuantity ? selectedServer.psuQuantity > 1 : true),
        
        // Environmental
        inletTempC: Math.max(0, Math.min(50, customInputs.inletTempC || 25)),
        formFactor: (selectedServer.ruSize === 1 ? '1U' : selectedServer.ruSize === 2 ? '2U' : '4U') as '1U' | '2U' | '4U'
      };
    } catch (error) {
      console.error('Error creating power inputs:', error);
      return null;
    }
  }, [selectedServer, customInputs, storageDevices, networkPorts]);
  
  const handleCalculate = useCallback(() => {
    if (!powerInputs) {
      console.error('No power inputs available for calculation');
      return;
    }
    
    try {
      console.log('Calculating power with inputs:', powerInputs);
      const result = calculateServerPower(powerInputs, calibrationProfile || undefined);
      console.log('Power calculation result:', result);
      setCalculationResult(result);
    } catch (error) {
      console.error('Power calculation failed:', error);
      setCalculationResult(null);
      throw error; // Re-throw to be caught by the component
    }
  }, [powerInputs, calibrationProfile, setCalculationResult]);
  
  const handleCalibrationChange = useCallback((profile: PowerCalibrationProfile | null) => {
    // Recalculate if we already have results
    if (powerInputs) {
      try {
        const result = calculateServerPower(powerInputs, profile || undefined);
        setCalculationResult(result);
      } catch (error) {
        console.error('Calibration recalculation failed:', error);
        throw error;
      }
    }
  }, [powerInputs, setCalculationResult]);
  
  return {
    powerInputs,
    handleCalculate,
    handleCalibrationChange
  };
};
