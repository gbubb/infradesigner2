import { supabase } from "@/integrations/supabase/client";
import { useDesignStore } from "@/store/designStore";
import { InfrastructureDesign } from "@/types/infrastructure/design-types";
import { RackService } from "@/services/rackService";

export class LayoutPersistenceService {
  static async saveCurrentLayout() {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    if (!activeDesign) throw new Error("No design loaded.");
    // Save the rackprofiles to DB (patch the design)
    const { error } = await supabase
      .from("designs")
      .update({ rackprofiles: JSON.stringify(activeDesign.rackprofiles || []) }) // use rackprofiles, not rackProfiles
      .eq("id", activeDesign.id);
    if (error) throw error;
  }

  static async loadLayoutForDesign(): Promise<{ 
    rackprofiles: InfrastructureDesign['rackprofiles'];
    requirements?: InfrastructureDesign['requirements'];
  }> {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    if (!activeDesign) throw new Error("No design loaded.");
    // Expect rackprofiles and requirements in the result
    const { data, error } = await supabase
      .from("designs")
      .select("rackprofiles, requirements") // Also select requirements for validation
      .eq("id", activeDesign.id)
      .maybeSingle();
    if (error) throw error;

    // Parse requirements if it exists and is a string
    let parsedRequirements: InfrastructureDesign['requirements'] | undefined;
    if (data?.requirements && typeof data.requirements === 'string') {
      try {
        parsedRequirements = JSON.parse(data.requirements);
      } catch (e) {
        console.error('Error parsing requirements:', e);
      }
    }

    const parsedRackprofiles = data?.rackprofiles ? JSON.parse(String(data.rackprofiles) || '[]') : [];
    
    return { 
      rackprofiles: parsedRackprofiles,
      requirements: parsedRequirements
    };
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
