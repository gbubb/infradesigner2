import { supabase } from "@/integrations/supabase/client";
import { useDesignStore } from "@/store/designStore";
import { InfrastructureDesign } from "@/types/infrastructure/design-types";

export class LayoutPersistenceService {
  static async saveCurrentLayout() {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    if (!activeDesign) throw new Error("No design loaded.");
    // Save the rackprofiles to DB (patch the design)
    const { error } = await supabase
      .from("designs")
      .update({ rackprofiles: activeDesign.rackprofiles }) // use rackprofiles, not rackProfiles
      .eq("id", activeDesign.id);
    if (error) throw error;
  }

  static async loadLayoutForDesign() {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    if (!activeDesign) throw new Error("No design loaded.");
    // Expect rackprofiles in the result
    const { data, error } = await supabase
      .from("designs")
      .select("rackprofiles") // use rackprofiles, not rackProfiles
      .eq("id", activeDesign.id)
      .maybeSingle();
    if (error) throw error;
    return { rackprofiles: data?.rackprofiles } as { rackprofiles: InfrastructureDesign['rackprofiles'] };
  }

  /**
   * Instead of deleting racks, just clear the devices arrays in each rack.
   * The new implementation resets device placement but preserves the rack objects themselves.
   */
  static async resetLayoutToLastSaved() {
    const data = await this.loadLayoutForDesign();

    // NEW LOGIC: Keep the racks, just clear devices.
    if (data && data.rackprofiles && Array.isArray(data.rackprofiles)) {
      // Remove all devices from each rack, but keep racks themselves
      const unplacedRacks = data.rackprofiles.map(rack => ({
        ...rack,
        devices: [], // Remove assigned devices!
      }));

      // Replace the design's rackprofiles with these "emptied" versions
      const state = useDesignStore.getState();
      if (state.activeDesign && typeof state.updateDesign === "function") {
        state.updateDesign(state.activeDesign.id, { rackprofiles: unplacedRacks });
      }
    } else {
      // If saved rackprofiles are missing, also preserve existing racks but clear devices
      const state = useDesignStore.getState();
      const currentRacks = state.activeDesign?.rackprofiles ?? [];
      const unplacedRacks = currentRacks.map(rack => ({
        ...rack,
        devices: [],
      }));
      if (state.activeDesign && typeof state.updateDesign === "function") {
        state.updateDesign(state.activeDesign.id, { rackprofiles: unplacedRacks });
      }
    }
  }
}
