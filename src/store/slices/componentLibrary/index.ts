
import { StateCreator } from 'zustand';
import { StoreState } from '../../types';
import { ComponentLibrarySlice } from './types';
import { handleDefaultComponents } from './defaultComponentOperations';
import { handleDatabaseOperations } from './databaseOperations';
import { handleTemplateOperations } from './templateOperations';

export const createComponentLibrarySlice: StateCreator<
  StoreState,
  [],
  [],
  ComponentLibrarySlice
> = (set, get) => {
  return {
    componentTemplates: [],
    ...handleDefaultComponents(set, get),
    ...handleDatabaseOperations(set, get),
    ...handleTemplateOperations(set, get)
  };
};

export type { ComponentLibrarySlice } from './types';
