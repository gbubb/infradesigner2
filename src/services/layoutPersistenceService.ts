
import { supabase } from "@/integrations/supabase/client";
import { useDesignStore } from "@/store/designStore";
import { InfrastructureDesign } from "@/types/infrastructure/design-types";
import { RackService } from "@/services/rackService";
import { v4 as uuidv4 } from "uuid";

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
   * Instead of deleting racks, this function completely resets the layout by clearing the rack profiles
   * and triggering a regeneration through the rack initialization process.
   */
  static async resetLayoutToLastSaved() {
    // Clear all racks to trigger regeneration
    RackService.clearAllRackProfiles();
    
    // Update the design's rackprofiles to empty to ensure full regeneration
    const state = useDesignStore.getState();
    if (state.activeDesign && typeof state.updateDesign === "function") {
      state.updateDesign(state.activeDesign.id, { rackprofiles: [] });
    }
    
    // Force react components to rerender by returning a timestamp
    return { resetTimestamp: Date.now() };
  }
}
