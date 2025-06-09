import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PowerCalibrationProfile } from '@/components/model/power-calibration/PowerCalibrationTypes';
import { DEFAULT_CALIBRATION_PROFILE } from '@/components/model/power-calibration/PowerCalibrationConstants';

// Storage functions
export function saveCalibrationProfile(profile: PowerCalibrationProfile): void {
  const profiles = getCalibrationProfiles();
  const index = profiles.findIndex(p => p.id === profile.id);
  
  if (index >= 0) {
    profiles[index] = { ...profile, updatedAt: new Date() };
  } else {
    profiles.push(profile);
  }
  
  localStorage.setItem('powerCalibrationProfiles', JSON.stringify(profiles));
}

export function getCalibrationProfiles(): PowerCalibrationProfile[] {
  const stored = localStorage.getItem('powerCalibrationProfiles');
  if (!stored) return [];
  
  try {
    const profiles = JSON.parse(stored);
    // Convert date strings back to Date objects and ensure all required fields exist
    return profiles.map((p: any) => {
      // Ensure memoryPowerModel exists with all required fields
      if (!p.memoryPowerModel) {
        p.memoryPowerModel = DEFAULT_CALIBRATION_PROFILE.memoryPowerModel;
      } else {
        // Ensure all sub-objects exist
        if (!p.memoryPowerModel.controllerBasePower) {
          p.memoryPowerModel.controllerBasePower = DEFAULT_CALIBRATION_PROFILE.memoryPowerModel.controllerBasePower;
        }
        if (!p.memoryPowerModel.powerPerChip) {
          p.memoryPowerModel.powerPerChip = DEFAULT_CALIBRATION_PROFILE.memoryPowerModel.powerPerChip;
        }
        if (!p.memoryPowerModel.chipsPerGB) {
          p.memoryPowerModel.chipsPerGB = DEFAULT_CALIBRATION_PROFILE.memoryPowerModel.chipsPerGB;
        }
        if (!p.memoryPowerModel.activityMultipliers) {
          p.memoryPowerModel.activityMultipliers = DEFAULT_CALIBRATION_PROFILE.memoryPowerModel.activityMultipliers;
        }
        if (!p.memoryPowerModel.speedScaling) {
          p.memoryPowerModel.speedScaling = DEFAULT_CALIBRATION_PROFILE.memoryPowerModel.speedScaling;
        }
      }
      
      return {
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt)
      };
    });
  } catch {
    return [];
  }
}

export function deleteCalibrationProfile(id: string): void {
  const profiles = getCalibrationProfiles().filter(p => p.id !== id);
  localStorage.setItem('powerCalibrationProfiles', JSON.stringify(profiles));
}

export function getActiveCalibrationProfile(): PowerCalibrationProfile | null {
  const activeId = localStorage.getItem('activeCalibrationProfileId');
  if (!activeId) return null;
  
  const profiles = getCalibrationProfiles();
  return profiles.find(p => p.id === activeId) || null;
}

export function setActiveCalibrationProfile(id: string | null): void {
  if (id) {
    localStorage.setItem('activeCalibrationProfileId', id);
  } else {
    localStorage.removeItem('activeCalibrationProfileId');
  }
}

// Hook for managing calibration profiles
export function useCalibrationProfiles(onCalibrationChange: (profile: PowerCalibrationProfile | null) => void) {
  const [profiles, setProfiles] = useState<PowerCalibrationProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<PowerCalibrationProfile | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  
  // Load profiles on mount
  useEffect(() => {
    const loadedProfiles = getCalibrationProfiles();
    setProfiles(loadedProfiles);
    
    const activeProfile = getActiveCalibrationProfile();
    if (activeProfile) {
      setActiveProfileId(activeProfile.id);
      setEditingProfile(activeProfile);
      onCalibrationChange(activeProfile);
    }
  }, [onCalibrationChange]);
  
  const handleCreateNew = () => {
    const newProfile: PowerCalibrationProfile = {
      ...DEFAULT_CALIBRATION_PROFILE,
      id: uuidv4(),
      name: `Custom Profile ${profiles.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingProfile(newProfile);
  };
  
  const handleCloneProfile = () => {
    if (!editingProfile) return;
    
    const clonedProfile: PowerCalibrationProfile = {
      ...editingProfile,
      id: uuidv4(),
      name: `${editingProfile.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingProfile(clonedProfile);
  };
  
  const handleSaveProfile = () => {
    if (!editingProfile) return;
    
    saveCalibrationProfile(editingProfile);
    const updatedProfiles = getCalibrationProfiles();
    setProfiles(updatedProfiles);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };
  
  const handleDeleteProfile = (id: string) => {
    deleteCalibrationProfile(id);
    const updatedProfiles = getCalibrationProfiles();
    setProfiles(updatedProfiles);
    
    if (activeProfileId === id) {
      setActiveProfileId(null);
      setEditingProfile(null);
      setActiveCalibrationProfile(null);
      onCalibrationChange(null);
    }
  };
  
  const handleSelectProfile = (id: string) => {
    if (id === 'none') {
      setActiveProfileId(null);
      setEditingProfile(null);
      setActiveCalibrationProfile(null);
      onCalibrationChange(null);
    } else {
      const profile = profiles.find(p => p.id === id);
      if (profile) {
        setActiveProfileId(id);
        setEditingProfile(profile);
        setActiveCalibrationProfile(id);
        onCalibrationChange(profile);
      }
    }
  };
  
  const updateProfile = (updates: Partial<PowerCalibrationProfile>) => {
    if (!editingProfile) return;
    setEditingProfile({ ...editingProfile, ...updates });
  };
  
  const updateNestedValue = (path: string[], value: any) => {
    if (!editingProfile) return;
    
    const newProfile = { ...editingProfile };
    let current: any = newProfile;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current)) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    
    current[path[path.length - 1]] = value;
    setEditingProfile(newProfile);
  };
  
  return {
    profiles,
    activeProfileId,
    editingProfile,
    showSaveSuccess,
    handleCreateNew,
    handleCloneProfile,
    handleSaveProfile,
    handleDeleteProfile,
    handleSelectProfile,
    updateProfile,
    updateNestedValue
  };
}