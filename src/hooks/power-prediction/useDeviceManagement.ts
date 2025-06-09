import { useCallback } from 'react';
import { StorageDevice, NetworkPort } from '@/components/model/power-prediction/types';

export const useDeviceManagement = (
  storageDevices: StorageDevice[],
  setStorageDevices: React.Dispatch<React.SetStateAction<StorageDevice[]>>,
  networkPorts: NetworkPort[],
  setNetworkPorts: React.Dispatch<React.SetStateAction<NetworkPort[]>>
) => {
  const addStorageDevice = useCallback(() => {
    setStorageDevices(current => [...current, {
      id: Date.now().toString(),
      type: 'HDD',
      count: 1,
      capacityTB: 1,
      rpm: 7200
    }]);
  }, [setStorageDevices]);
  
  const removeStorageDevice = useCallback((id: string) => {
    setStorageDevices(current => current.filter(d => d.id !== id));
  }, [setStorageDevices]);
  
  const updateStorageDevice = useCallback((id: string, updates: Partial<StorageDevice>) => {
    setStorageDevices(current => current.map(d => 
      d.id === id ? { ...d, ...updates } : d
    ));
  }, [setStorageDevices]);
  
  const addNetworkPort = useCallback(() => {
    setNetworkPorts(current => [...current, {
      id: Date.now().toString(),
      count: 1,
      speedGbps: 10
    }]);
  }, [setNetworkPorts]);
  
  const removeNetworkPort = useCallback((id: string) => {
    setNetworkPorts(current => current.filter(p => p.id !== id));
  }, [setNetworkPorts]);
  
  const updateNetworkPort = useCallback((id: string, updates: Partial<NetworkPort>) => {
    setNetworkPorts(current => current.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  }, [setNetworkPorts]);
  
  return {
    // Storage device operations
    addStorageDevice,
    removeStorageDevice,
    updateStorageDevice,
    
    // Network port operations
    addNetworkPort,
    removeNetworkPort,
    updateNetworkPort
  };
};