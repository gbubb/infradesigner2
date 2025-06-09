# Refactoring Instructions for Large Files

This document contains specific refactoring instructions for each large file identified in the codebase. Each section provides detailed prompts that can be used in a Claude session to perform the refactoring work.

## ✅ COMPLETED: 4. sidebar.tsx (761 lines)

**Status**: COMPLETED on 6/9/2025
- Successfully refactored from 761 lines to ~27 lines (96% reduction)
- Created modular structure in `/src/components/ui/`:
  - SidebarProvider.tsx - Context provider and state management (117 lines)
  - SidebarComponents.tsx - All UI components (553 lines)
  - SidebarHooks.tsx - Custom hooks (10 lines)
  - SidebarTypes.ts - TypeScript interfaces and types (59 lines)
  - sidebar.tsx - Main export file (27 lines)
- All functionality preserved with no breaking changes
- Build successful, no linting errors introduced

### Key Improvements:
- Context and state logic separated from UI components
- Component definitions are now individually maintainable
- Type definitions centralized for better type safety
- Hook extraction enables reusability
- Main file now serves as a clean export facade

## 🎯 NEXT TASK: ManualConnectionDialog.tsx (529 lines)
**Ready to start refactoring - See section 5 below for detailed instructions**

## ✅ COMPLETED: 1. connectionService.ts (1,031 lines)

**Status**: COMPLETED on 6/9/2025
- Successfully refactored into 6 specialized modules in `/src/services/connection/`:
  - ConnectionGenerator.ts - Core connection generation logic
  - CableManager.ts - Cable-related functions and length calculations
  - TransceiverManager.ts - Transceiver compatibility and selection
  - BreakoutManager.ts - Breakout cable handling
  - ConnectionValidator.ts - Connection validation logic
  - PortMatcher.ts - Port filtering and matching algorithms
- Main connectionService.ts now serves as a clean facade
- All tests pass: build successful, no linting errors in refactored code

## ✅ COMPLETED: 2. ComponentFormDialog.tsx (730 lines)

**Status**: COMPLETED on 6/9/2025
**Files Created**:
- Successfully refactored into modular components in `/src/components/sidebar/dialogs/forms/component-forms/`:
  - ComponentValidationSchemas.ts - Extracted all Zod validation schemas
  - ComponentFormFactory.tsx - Factory component for rendering type-specific forms
  - DiskComponentForm.tsx - Disk-specific form fields
  - GPUComponentForm.tsx - GPU-specific form fields (placeholder for future)
  - PortManagementSection.tsx - Extracted port management UI (bulk and individual)
- Main ComponentFormDialog.tsx reduced from 730 to ~300 lines (59% reduction)
- All tests pass: build successful, no linting errors in refactored code

### Key Improvements:
- Validation schemas are now centralized and reusable
- Component-specific forms can be maintained independently
- Port management logic is isolated and reusable
- Factory pattern makes adding new component types easier
- Form maintains all existing functionality

## ✅ COMPLETED: 3. RackLayoutsTab.tsx (724 lines)

**Status**: COMPLETED on 6/9/2025
- Successfully refactored from 724 lines to ~220 lines (70% reduction)
- Consolidated 20+ useState calls into 5 specialized custom hooks
- Created modular structure in `/src/hooks/rack-management/`:
  - useRackManagement.ts - Rack selection and statistics management
  - useDevicePlacement.ts - Device placement logic and dialog states
  - useRackFiltering.ts - AZ filtering and rack display logic
  - useRackPersistence.ts - Save/load/reset functionality with auto-save
  - useRackScrolling.ts - Scroll position management
- Created RackOperationsService.ts for business logic extraction
- All tests pass: build successful, no linting errors in refactored code

### Key Improvements:
- State management is now organized into logical, reusable hooks
- Business logic separated from UI concerns
- Improved maintainability with clear separation of concerns
- Easier to test individual hooks in isolation
- Component is now a thin UI layer that orchestrates hooks

## 🎯 4. sidebar.tsx (761 lines) - NEXT TASK TO COMPLETE

**Status**: NOT STARTED
**Recommended Start Date**: Ready to begin immediately

### Overview:
This is the next file to refactor. It contains UI component definitions that should be split into separate modules for better maintainability and reusability.

### Prompt:
"Refactor the sidebar.tsx UI component file by splitting it into:

1. **ConnectionGenerator.ts**: Extract the core connection generation logic including `generateConnections()` and related helper functions. This should handle the main connection creation workflow.

2. **CableManager.ts**: Extract all cable-related functions including:
   - `estimateCableLength()`
   - `getCableTemplate()`
   - Cable length calculation logic
   - Cable type selection logic

3. **TransceiverManager.ts**: Extract transceiver-related functions:
   - `getTransceiverForConnection()`
   - `isTransceiverCompatible()`
   - Transceiver compatibility checking
   - Transceiver selection logic

4. **BreakoutManager.ts**: Extract breakout cable logic:
   - `generateBreakoutConnections()`
   - `isBreakoutCable()`
   - Breakout cable validation and creation

5. **ConnectionValidator.ts**: Extract validation functions:
   - `validateConnection()`
   - `validatePortCompatibility()`
   - Connection rule validation

6. **PortMatcher.ts**: Extract port filtering and matching:
   - `filterPorts()`
   - `findMatchingPorts()`
   - Port selection algorithms

Keep the main connectionService.ts as a facade that imports and orchestrates these modules. Ensure all TypeScript types are properly exported/imported and maintain backward compatibility with existing code that uses connectionService."

## 2. sidebar.tsx (761 lines)

### Prompt:
"Refactor the sidebar.tsx UI component file by splitting it into:

1. **SidebarProvider.tsx**: Extract the context provider, state management, and any global sidebar logic. This should export the SidebarProvider component and useSidebar hook.

2. **SidebarComponents.tsx**: Extract individual UI components like:
   - SidebarHeader
   - SidebarFooter
   - SidebarContent
   - SidebarGroup
   - SidebarGroupLabel
   - SidebarMenu
   - SidebarMenuItem
   - SidebarMenuButton
   - etc.

3. **SidebarHooks.tsx**: Extract custom hooks:
   - useSidebar
   - useIsMobile
   - Any other sidebar-specific hooks

4. **SidebarTypes.ts**: Extract all TypeScript interfaces and types

5. **sidebar.tsx**: Keep as the main export file that re-exports all components

Ensure the refactoring maintains the existing API so no breaking changes occur in components using the sidebar."


## 3. RackLayoutsTab.tsx (724 lines)

### Prompt:
"Refactor RackLayoutsTab.tsx to improve maintainability:

1. Create custom hooks in a new `hooks/rack-management/` directory:
   - **useRackManagement.ts**: Extract rack selection, active rack state, and rack statistics logic
   - **useDevicePlacement.ts**: Extract device placement logic, placement validation, and placement operations
   - **useRackFiltering.ts**: Extract all filter-related state and logic (search, type filters, cluster filters, etc.)
   - **useRackStats.ts**: Extract rack utilization calculations and statistics

2. Create a **RackOperationsService.ts**: Move business logic for:
   - Rack creation/deletion
   - Device placement calculations
   - Placement validation rules
   - Auto-placement logic

3. Extract sub-components if any inline components exist

4. Simplify the main component to orchestrate these hooks and render UI

The component should become a thin UI layer that uses these hooks and services. Reduce the 20+ useState calls by consolidating related state in the custom hooks."

## 4. ManualConnectionDialog.tsx (529 lines)

### Prompt:
"Refactor ManualConnectionDialog.tsx by extracting components:

1. Create in `components/connections/manual/`:
   - **PortSelector.tsx**: Component for selecting source and destination ports with filtering
   - **ConnectionList.tsx**: Component displaying the list of created connections with delete functionality
   - **MediaTypeSelector.tsx**: Component for selecting cable media type and related options
   - **PortGroupSelector.tsx**: Component for port group selection if applicable

2. Create **useConnectionCreation.ts** hook that handles:
   - Connection validation logic
   - Temporary connection state management
   - Connection creation operations
   - Port availability checking

3. Create **ConnectionTypes.ts**: Extract all interfaces and types related to manual connections

4. Update ManualConnectionDialog to use these components and maintain its role as the dialog container

Ensure the refactoring maintains all existing functionality including real-time validation and error handling."

## 5. CablingFormFields.tsx (521 lines)

### Prompt:
"Refactor CablingFormFields.tsx by extracting individual field components:

1. Create a `forms/cabling-fields/` directory with:
   - **CableTypeField.tsx**: Cable type selection field
   - **ConnectorTypeFields.tsx**: Connector type selection for both ends
   - **FiberConfigFields.tsx**: Fiber count, mode, and related fields
   - **CopperConfigFields.tsx**: Copper-specific configuration fields
   - **CableLengthField.tsx**: Cable length input with validation
   - **TransceiverCompatibilityFields.tsx**: Transceiver-related fields

2. Create **CablingValidation.ts**: Extract all validation logic and rules

3. Create **useCablingForm.ts**: Custom hook for form state and operations

4. Update CablingFormFields.tsx to compose these field components

The refactoring should make it easier to maintain individual field logic and reuse fields in other forms."

## General Refactoring Guidelines

For all refactoring tasks:
1. Maintain backward compatibility - no breaking changes to public APIs
2. Preserve all existing functionality
3. Add proper TypeScript types where missing
4. Follow the existing code style and conventions
5. Update imports in files that depend on the refactored code
6. Test that the application still builds and lints successfully
7. Add code comments for complex logic that gets moved
8. Consider creating unit tests for extracted business logic modules

## Execution Order

Recommended order for refactoring:
1. ✅ COMPLETED: connectionService.ts (highest impact on maintainability) - Done 6/9/2025
2. ✅ COMPLETED: ComponentFormDialog.tsx (improves form maintainability) - Done 6/9/2025
3. ✅ COMPLETED: RackLayoutsTab.tsx (reduces complexity) - Done 6/9/2025
4. ✅ COMPLETED: sidebar.tsx (UI component organization) - Done 6/9/2025
5. ⏳ NEXT: ManualConnectionDialog.tsx (connection UI components) - Ready to start
6. 📋 TODO: CablingFormFields.tsx (form field extraction)

Each refactoring can be done independently. The first three refactorings are complete and serve as good examples of the modular approach to use for the remaining files.

## Progress Summary

### Completed Work (6/9/2025):

**✅ 4 of 6 files completed (67% progress)**

#### 1. connectionService.ts
- ✅ Successfully refactored from 1,031 lines into 6 focused modules
- Reduced file to 59 lines (94% reduction)
- Created clean module structure in `/src/services/connection/`
- All functionality preserved, no breaking changes
- Build and lint tests pass

#### 2. ComponentFormDialog.tsx
- ✅ Successfully refactored from 730 lines to ~300 lines (59% reduction)
- Created modular structure in `/src/components/sidebar/dialogs/forms/component-forms/`:
  - ComponentValidationSchemas.ts - Centralized validation
  - ComponentFormFactory.tsx - Dynamic form rendering
  - DiskComponentForm.tsx - Disk-specific fields
  - GPUComponentForm.tsx - GPU fields (future-ready)
  - PortManagementSection.tsx - Port management UI
- Improved maintainability and extensibility
- All tests pass, no breaking changes

#### 3. RackLayoutsTab.tsx
- ✅ Successfully refactored from 724 lines to ~220 lines (70% reduction)
- Consolidated 20+ useState calls into 5 specialized custom hooks
- Created modular structure in `/src/hooks/rack-management/`:
  - useRackManagement.ts - Rack selection and statistics
  - useDevicePlacement.ts - Device placement logic
  - useRackFiltering.ts - AZ filtering and display
  - useRackPersistence.ts - Save/load/reset with auto-save
  - useRackScrolling.ts - Scroll management
- Created RackOperationsService.ts for business logic
- All tests pass, component is now a thin UI layer

#### 4. sidebar.tsx
- ✅ Successfully refactored from 761 lines to ~27 lines (96% reduction)
- Created modular structure in `/src/components/ui/`:
  - SidebarProvider.tsx - Context provider and state management (117 lines)
  - SidebarComponents.tsx - All UI components (553 lines)
  - SidebarHooks.tsx - Custom hooks (10 lines)
  - SidebarTypes.ts - TypeScript interfaces and types (59 lines)
  - sidebar.tsx - Main export file (27 lines)
- Separated context, UI components, hooks, and types
- All tests pass, no breaking changes

### 🚀 Next Steps:
**The next agent should start with ManualConnectionDialog.tsx refactoring:**

1. **Read ManualConnectionDialog.tsx** to understand its current structure (529 lines)
2. **Follow the instructions in section 5** to split it into:
   - PortSelector.tsx (port selection UI)
   - ConnectionList.tsx (connection display)
   - MediaTypeSelector.tsx (cable media selection)
   - PortGroupSelector.tsx (port group selection)
   - useConnectionCreation.ts (connection logic hook)
   - ConnectionTypes.ts (TypeScript interfaces)
3. **Test the refactoring** with `npm run build` and `npm run lint`
4. **Update this document** with completion status and metrics
5. **Move to the final file** (CablingFormFields.tsx)