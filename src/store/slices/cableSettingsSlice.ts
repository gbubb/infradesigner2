import { StateCreator } from 'zustand';
import { CableDistanceSettings, DEFAULT_CABLE_DISTANCE_SETTINGS } from '@/types/infrastructure/cable-settings-types';

export interface CableSettingsSlice {
  cableDistanceSettings: CableDistanceSettings;
  updateCableDistanceSettings: (settings: Partial<CableDistanceSettings>) => void;
  resetCableDistanceSettings: () => void;
}

export const createCableSettingsSlice: StateCreator<
  CableSettingsSlice,
  [],
  [],
  CableSettingsSlice
> = (set) => ({
  cableDistanceSettings: DEFAULT_CABLE_DISTANCE_SETTINGS,
  
  updateCableDistanceSettings: (settings) => {
    set((state) => ({
      cableDistanceSettings: {
        ...state.cableDistanceSettings,
        ...settings
      }
    }));
  },
  
  resetCableDistanceSettings: () => {
    set({
      cableDistanceSettings: DEFAULT_CABLE_DISTANCE_SETTINGS
    });
  }
});