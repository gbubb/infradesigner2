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
   * THIS NO LONGER LOADS FROM DATABASE!
   * Instead, just clears all racks, so that fresh initialization from requirements
   * will always occur after reset, never loading any cached or stale layouts.
   */
  static async resetLayoutToLastSaved() {
    RackService.clearAllRackProfiles();

    // Also clear from design.rackprofiles
    const state = useDesignStore.getState();
    if (state.activeDesign && typeof state.updateDesign === "function") {
      state.updateDesign(state.activeDesign.id, { rackprofiles: [] });
    }

    // Return timestamp to allow tracking/force refresh (if necessary)
    return { resetTimestamp: Date.now() };
  }
}
