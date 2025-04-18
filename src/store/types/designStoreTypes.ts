
import { DesignSlice } from '../slices/design/types';
import { RequirementsSlice } from '../slices/requirementsSlice';
import { WorkspaceSlice } from '../slices/workspaceSlice';
import { ComponentLibrarySlice } from '../slices/componentLibrary';

// Combined store type
export type DesignStoreState = RequirementsSlice & DesignSlice & WorkspaceSlice & ComponentLibrarySlice;
