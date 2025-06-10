
import { DesignSlice } from '../slices/design/types';
import { RequirementsSlice } from '../slices/requirementsSlice';
import { WorkspaceSlice } from '../slices/workspaceSlice';
import { ComponentLibrarySlice } from '../slices/componentLibrary';
import { FacilitiesSlice } from '../slices/facilitiesSlice';

// Combined store type
export type DesignStoreState = RequirementsSlice & DesignSlice & WorkspaceSlice & ComponentLibrarySlice & FacilitiesSlice;
