
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
> = (set, get, api) => ({
  savedDesigns: [],
  activeDesign: null,
  
  // Include all sub-slices
  ...createDesignCreationSlice(set, get, api),
  ...createDesignSavingSlice(set, get, api),
  ...createDesignUpdateSlice(set, get, api),
  ...createDesignComponentsSlice(set, get, api)
});
