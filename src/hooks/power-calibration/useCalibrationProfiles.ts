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
    return profiles.map((p: Partial<PowerCalibrationProfile> & { createdAt: string; updatedAt: string }) => {
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
      
      // Ensure fanPowerByFormFactor exists (for backward compatibility)
      if (!p.fanPowerByFormFactor) {
        p.fanPowerByFormFactor = DEFAULT_CALIBRATION_PROFILE.fanPowerByFormFactor;
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
    } else {
      // If no active profile, create a default editable profile
      // This ensures the calibration inputs are always editable
      const defaultEditableProfile: PowerCalibrationProfile = {
        ...DEFAULT_CALIBRATION_PROFILE,
        id: 'temp-default',
        name: 'Default Settings',
        description: 'Default calibration values (not saved)',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setEditingProfile(defaultEditableProfile);
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
    
    // If saving the temporary default profile, create a new profile with a unique ID
    let profileToSave = editingProfile;
    if (editingProfile.id === 'temp-default') {
      profileToSave = {
        ...editingProfile,
        id: uuidv4(),
        name: editingProfile.name === 'Default Settings' ? `Custom Profile ${profiles.length + 1}` : editingProfile.name,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setEditingProfile(profileToSave);
      setActiveProfileId(profileToSave.id);
      setActiveCalibrationProfile(profileToSave.id);
      onCalibrationChange(profileToSave);
    }
    
    saveCalibrationProfile(profileToSave);
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
      setActiveCalibrationProfile(null);
      onCalibrationChange(null);
      // Keep a default editable profile when "none" is selected
      const defaultEditableProfile: PowerCalibrationProfile = {
        ...DEFAULT_CALIBRATION_PROFILE,
        id: 'temp-default',
        name: 'Default Settings',
        description: 'Default calibration values (not saved)',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setEditingProfile(defaultEditableProfile);
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
    const updatedProfile = { ...editingProfile, ...updates };
    setEditingProfile(updatedProfile);
    // Also update the active calibration if this is the active profile
    if (activeProfileId === editingProfile.id) {
      onCalibrationChange(updatedProfile);
    }
  };
  
  const updateNestedValue = (path: string[], value: number) => {
    if (!editingProfile) return;
    
    const newProfile = { ...editingProfile };
    let current: Record<string, unknown> = newProfile;
    
    for (let i = 0; i < path.length - 1; i++) {
      if (!(path[i] in current)) {
        current[path[i]] = {};
      }
      current = current[path[i]] as Record<string, unknown>;
    }
    
    current[path[path.length - 1]] = value;
    setEditingProfile(newProfile);
    // Also update the active calibration if this is the active profile
    if (activeProfileId === editingProfile.id) {
      onCalibrationChange(newProfile);
    }
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