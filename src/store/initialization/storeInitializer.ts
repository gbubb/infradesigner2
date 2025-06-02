
import { useDesignStore } from '../designStore';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Flag to track if initialization has occurred
let storeInitialized = false;
let currentUserId: string | null = null;

export const initializeStore = async () => {
  const state = useDesignStore.getState();
  
  // Get current user ID
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id || null;
  
  // Re-initialize if user changed or first time
  if (storeInitialized && currentUserId === userId) return;
  
  currentUserId = userId;
  
  try {
    await state.loadComponentsFromDB();
    
    if (state.componentRoles.length === 0) {
      state.calculateComponentRoles();
    }
    
    // Initialize role configurations if empty
    if (Object.keys(state.selectedDisksByRole).length === 0) {
      state.selectedDisksByRole = {};
    }
    
    if (Object.keys(state.selectedGPUsByRole).length === 0) {
      state.selectedGPUsByRole = {};
    }
    
    if (Object.keys(state.selectedCassettesByRole).length === 0) {
      state.selectedCassettesByRole = {};
    }
    
    await state.loadDesignsFromDB();
    
    storeInitialized = true;
    console.log("Store initialized");
  } catch (error) {
    console.error("Error during store initialization:", error);
    toast.error("Error initializing application data");
    
    if (state.componentTemplates.length === 0) {
      state.initializeComponentTemplates();
    }
    
    storeInitialized = true;
  }
};

