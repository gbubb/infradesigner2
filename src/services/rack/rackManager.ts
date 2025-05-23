import { v4 as uuidv4 } from 'uuid';
import { useDesignStore } from '@/store/designStore';
import { RackProfile, RackType } from '@/types/infrastructure/rack-types';

export class RackManager {
  private static getStorageKey(): string {
    const state = useDesignStore.getState();
    const activeDesignId = state.activeDesign?.id;
    return `rack_profiles_${activeDesignId}`;
  }

  static getAllRackProfiles(): RackProfile[] {
    const state = useDesignStore.getState();

    // Return from design if available
    if (state.activeDesign?.rackprofiles) {
      return state.activeDesign.rackprofiles;
    }

    // Otherwise load from local storage
    const storageKey = this.getStorageKey();
    const storedProfiles = localStorage.getItem(storageKey);

    if (storedProfiles) {
      return JSON.parse(storedProfiles);
    }

    return [];
  }

  static getRackProfile(rackId: string): RackProfile | undefined {
    const profiles = this.getAllRackProfiles();
    return profiles.find(profile => profile.id === rackId);
  }

  static createRackProfile(
    name?: string,
    uHeight: number = 42, 
    availabilityZoneId?: string,
    rackType: RackType = RackType.ComputeStorage
  ): string {
    const state = useDesignStore.getState();
    const profiles = this.getAllRackProfiles();

    const newName = name || `Rack ${profiles.length + 1}`;

    const newProfile: RackProfile = {
      id: uuidv4(),
      name: newName,
      uHeight,
      devices: [],
      availabilityZoneId,
      rackType
    };

    profiles.push(newProfile);

    // Update in design if possible
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        rackprofiles: profiles
      });
    }

    // Also update in local storage as backup
    const storageKey = this.getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(profiles));

    return newProfile.id;
  }

  static clearAllRackProfiles(): void {
    const state = useDesignStore.getState();

    // Update in design if possible
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        rackprofiles: []
      });
    }

    // Also clear local storage backup
    const storageKey = this.getStorageKey();
    localStorage.removeItem(storageKey);
  }

  static updateRackProfile(rackId: string, updates: Partial<RackProfile>): boolean {
    const state = useDesignStore.getState();
    const profiles = this.getAllRackProfiles();

    const index = profiles.findIndex(profile => profile.id === rackId);
    if (index === -1) {
      return false;
    }

    profiles[index] = {
      ...profiles[index],
      ...updates
    };

    // Update in design if possible
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        rackprofiles: profiles
      });
    }

    // Also update in local storage as backup
    const storageKey = this.getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(profiles));

    return true;
  }

  static deleteRackProfile(rackId: string): boolean {
    const state = useDesignStore.getState();
    const profiles = this.getAllRackProfiles();

    const newProfiles = profiles.filter(profile => profile.id !== rackId);

    if (newProfiles.length === profiles.length) {
      return false; // No profile was deleted
    }

    // Update in design if possible
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        rackprofiles: newProfiles
      });
    }

    // Also update in local storage as backup
    const storageKey = this.getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify(newProfiles));

    return true;
  }
}
