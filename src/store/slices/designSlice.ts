
import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { InfrastructureComponent, InfrastructureDesign } from '@/types/infrastructure';
import { StoreState } from '../types';
import { saveDesign, deleteDesign } from '@/services/designService';

export interface DesignSlice {
  // All saved designs
  savedDesigns: InfrastructureDesign[];
  
  // Currently active design
  activeDesign: InfrastructureDesign | null;
  
  // Create a new design
  createNewDesign: (name: string, description?: string) => void;
  
  // Update the active design components
  updateActiveDesign: (components: InfrastructureComponent[]) => void;
  
  // Update an existing design
  updateDesign: (id: string, updates: Partial<InfrastructureDesign>) => void;
  
  // Delete a design
  deleteDesign: (id: string) => void;
  
  // Set active design
  setActiveDesign: (id: string) => void;
}

export const createDesignSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignSlice
> = (set, get) => ({
  savedDesigns: [],
  activeDesign: null,
  
  createNewDesign: (name, description) => {
    set((state) => {
      const requirements = { ...state.requirements };
      
      const newDesign: InfrastructureDesign = {
        id: uuidv4(),
        name,
        description: description || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        requirements,
        components: []
      };
      
      const updatedDesigns = [...state.savedDesigns, newDesign];
      
      // Save to Supabase
      saveDesign(newDesign);
      
      toast.success(`Created new design: ${name}`);
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: newDesign
      };
    });
  },
  
  updateActiveDesign: (components) => {
    set((state) => {
      if (!state.activeDesign) {
        toast.error("No active design to update");
        return state;
      }
      
      const updatedDesign: InfrastructureDesign = {
        ...state.activeDesign,
        components,
        updatedAt: new Date()
      };
      
      // Update in the saved designs list
      const updatedDesigns = state.savedDesigns.map(design => 
        design.id === updatedDesign.id ? updatedDesign : design
      );
      
      // Save to Supabase
      saveDesign(updatedDesign);
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: updatedDesign
      };
    });
  },
  
  updateDesign: (id, updates) => {
    set((state) => {
      const existingDesignIndex = state.savedDesigns.findIndex(d => d.id === id);
      
      if (existingDesignIndex === -1) {
        toast.error("Design not found");
        return state;
      }
      
      const existingDesign = state.savedDesigns[existingDesignIndex];
      const updatedDesign = {
        ...existingDesign,
        ...updates,
        updatedAt: new Date()
      };
      
      const updatedDesigns = [...state.savedDesigns];
      updatedDesigns[existingDesignIndex] = updatedDesign;
      
      // If this was the active design, update that too
      const newActiveDesign = 
        state.activeDesign && state.activeDesign.id === id 
          ? updatedDesign 
          : state.activeDesign;
      
      // Save to Supabase
      saveDesign(updatedDesign);
      
      toast.success(`Updated design: ${updatedDesign.name}`);
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: newActiveDesign
      };
    });
  },
  
  deleteDesign: (id) => {
    set((state) => {
      const designToDelete = state.savedDesigns.find(d => d.id === id);
      
      if (!designToDelete) {
        toast.error("Design not found");
        return state;
      }
      
      const updatedDesigns = state.savedDesigns.filter(d => d.id !== id);
      
      // If this was the active design, set active to null or the first available
      let newActiveDesign = state.activeDesign;
      if (state.activeDesign && state.activeDesign.id === id) {
        newActiveDesign = updatedDesigns.length > 0 ? updatedDesigns[0] : null;
      }
      
      // Delete from Supabase
      deleteDesign(id);
      
      toast.success(`Deleted design: ${designToDelete.name}`);
      
      return {
        savedDesigns: updatedDesigns,
        activeDesign: newActiveDesign
      };
    });
  },
  
  setActiveDesign: (id) => {
    set((state) => {
      const design = state.savedDesigns.find(d => d.id === id);
      
      if (!design) {
        toast.error("Design not found");
        return state;
      }
      
      toast.success(`Switched to design: ${design.name}`);
      
      return { activeDesign: design };
    });
  }
});
