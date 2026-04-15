import { supabase } from '@/lib/supabase';
import type { RackProfile, PlacedDevice } from '@/types/infrastructure/rack-types';

export class RackPowerCalculationService {
  /**
   * Calculate the actual power usage of a rack based on its devices
   */
  static async calculateRackPowerUsage(rack: RackProfile): Promise<number> {
    if (!rack.devices || rack.devices.length === 0) {
      return 0;
    }

    let totalPowerKw = 0;

    // Get all unique component IDs from the rack
    // `components` is a legacy nested shape on PlacedDevice rows; not in the current type.
    const componentIds = new Set<string>();
    for (const rawDevice of rack.devices) {
      const device = rawDevice as PlacedDevice & { components?: Array<{ id?: string; quantity?: number }> };
      if (device.components) {
        for (const component of device.components) {
          if (component.id) {
            componentIds.add(component.id);
          }
        }
      }
    }

    if (componentIds.size === 0) {
      return 0;
    }

    // Fetch component power requirements from database
    const { data: components, error } = await supabase
      .from('components')
      .select('id, powerrequired')
      .in('id', Array.from(componentIds));

    if (error) {
      console.error('Error fetching component power data:', error);
      return 0;
    }

    // Create a map of component ID to power requirement
    const componentPowerMap = new Map<string, number>();
    components?.forEach(comp => {
      componentPowerMap.set(comp.id, comp.powerrequired || 0);
    });

    // Calculate total power usage
    for (const rawDevice of rack.devices) {
      const device = rawDevice as PlacedDevice & { components?: Array<{ id?: string; quantity?: number }> };
      if (device.components) {
        for (const component of device.components) {
          if (component.id && componentPowerMap.has(component.id)) {
            const componentPower = componentPowerMap.get(component.id)!;
            const quantity = component.quantity || 1;
            // Convert from Watts to kW
            totalPowerKw += (componentPower * quantity) / 1000;
          }
        }
      }
    }

    return totalPowerKw;
  }

  /**
   * Update the actual power usage for a rack in the database
   */
  static async updateRackPowerUsage(rackId: string): Promise<number> {
    // First get the rack with its devices
    const { data: rack, error: rackError } = await supabase
      .from('rack_profiles')
      .select('*')
      .eq('id', rackId)
      .single();

    if (rackError || !rack) {
      console.error('Error fetching rack:', rackError);
      return 0;
    }

    // Calculate the actual power usage
    const actualPowerKw = await this.calculateRackPowerUsage(rack as unknown as RackProfile);

    // Update the rack with the calculated power
    const { error: updateError } = await supabase
      .from('rack_profiles')
      .update({
        actual_power_usage_kw: actualPowerKw
      })
      .eq('id', rackId);

    if (updateError) {
      console.error('Error updating rack power usage:', updateError);
      return 0;
    }

    return actualPowerKw;
  }

  /**
   * Update power usage for all racks in a facility
   */
  static async updateFacilityRacksPowerUsage(facilityId: string): Promise<void> {
    // Get all racks in the facility
    const { data: racks, error } = await supabase
      .from('rack_profiles')
      .select('id')
      .eq('facility_id', facilityId);

    if (error) {
      console.error('Error fetching facility racks:', error);
      return;
    }

    // Update power usage for each rack
    for (const rack of racks || []) {
      await this.updateRackPowerUsage(rack.id);
    }
  }

  /**
   * Calculate and update power usage for imported racks
   */
  static async updateImportedRacksPowerUsage(rackIds: string[]): Promise<void> {
    for (const rackId of rackIds) {
      await this.updateRackPowerUsage(rackId);
    }
  }
}