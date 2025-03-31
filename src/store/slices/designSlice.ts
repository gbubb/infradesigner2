
import { StateCreator } from 'zustand';
import { InfrastructureDesign, InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '../types';
import { createDesignCreationSlice, DesignCreationSlice } from './design/designCreationSlice';
import { createDesignSavingSlice, DesignSavingSlice } from './design/designSavingSlice';
import { createDesignUpdateSlice, DesignUpdateSlice } from './design/designUpdateSlice';
import { createDesignComponentsSlice, DesignComponentsSlice } from './design/designComponentsSlice';

export interface DesignSlice extends 
  DesignCreationSlice,
  DesignSavingSlice,
  DesignUpdateSlice,
  DesignComponentsSlice
{
  // Saved designs
  savedDesigns: InfrastructureDesign[];
  // Currently active design
  activeDesign: InfrastructureDesign | null;
}

export const createDesignSlice: StateCreator<
  StoreState,
  [],
  [],
  DesignSlice
> = (set, get) => ({
  savedDesigns: [],
  activeDesign: null,
  
  // Include all sub-slices
  ...createDesignCreationSlice(set, get),
  ...createDesignSavingSlice(set, get),
  ...createDesignUpdateSlice(set, get),
  ...createDesignComponentsSlice(set, get)
});
