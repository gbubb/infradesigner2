
import { DesignSlice } from '../slices/designSlice';
import { RequirementsSlice } from '../slices/requirementsSlice';
import { WorkspaceSlice } from '../slices/workspaceSlice';
import { ComponentLibrarySlice } from '../slices/componentLibrary';

// Combined store type
export type DesignStoreState = RequirementsSlice & DesignSlice & WorkspaceSlice & ComponentLibrarySlice;

