
import { supabase } from "@/integrations/supabase/client";
import { useDesignStore } from "@/store/designStore";
import { InfrastructureDesign } from "@/types/infrastructure/design-types";

export class LayoutPersistenceService {
  static async saveCurrentLayout() {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    if (!activeDesign) throw new Error("No design loaded.");
    // Save the rackProfiles to DB (patch the design)
    const { error } = await supabase
      .from("designs")
      .update({ rackProfiles: activeDesign.rackProfiles })
      .eq("id", activeDesign.id);
    if (error) throw error;
  }
  static async loadLayoutForDesign() {
    const state = useDesignStore.getState();
    const activeDesign = state.activeDesign;
    if (!activeDesign) throw new Error("No design loaded.");
    // Expect rackProfiles in the result
    const { data, error } = await supabase
      .from("designs")
      .select("rackProfiles")
      .eq("id", activeDesign.id)
      .maybeSingle();
    if (error) throw error;
    return data as { rackProfiles: InfrastructureDesign['rackProfiles'] };
  }
  static async resetLayoutToLastSaved() {
    const data = await this.loadLayoutForDesign();
    if (data && data.rackProfiles) {
      // Replace the design's rackProfiles with loaded version
      const state = useDesignStore.getState();
      if (state.activeDesign && typeof state.updateDesign === "function") {
        state.updateDesign(state.activeDesign.id, { rackProfiles: data.rackProfiles });
      }
    }
  }
}
