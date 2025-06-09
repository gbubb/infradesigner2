# Refactoring Instructions for Large Files

This document contains specific refactoring instructions for each large file identified in the codebase. Each section provides detailed prompts that can be used in a Claude session to perform the refactoring work.

## 1. connectionService.ts (1,031 lines) - HIGHEST PRIORITY

### Prompt:
"Refactor the connectionService.ts file by breaking it down into the following modules:

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

## 3. ComponentFormDialog.tsx (730 lines)

### Prompt:
"Refactor ComponentFormDialog.tsx by extracting type-specific forms:

1. Create separate form components in a new `forms/component-forms/` directory:
   - **ServerComponentForm.tsx**: Server-specific form fields and logic
   - **SwitchComponentForm.tsx**: Switch-specific form fields and logic
   - **RouterFirewallComponentForm.tsx**: Router/Firewall form fields
   - **StorageComponentForm.tsx**: Storage-specific form fields
   - **CablingComponentForm.tsx**: Cabling-specific form fields
   - **AccessoryComponentForm.tsx**: Accessory-specific form fields

2. Create **ComponentFormFactory.tsx**: A factory component that dynamically renders the correct form based on component type

3. Create **ComponentValidationSchemas.ts**: Extract all Zod validation schemas for each component type

4. Update **ComponentFormDialog.tsx** to:
   - Use the ComponentFormFactory
   - Handle only the dialog wrapper logic
   - Manage form submission and API calls
   - Keep the common form structure

Ensure form data flow and validation work exactly as before. The refactoring should not change any functionality, only improve code organization."

## 4. RackLayoutsTab.tsx (724 lines)

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

## 5. ManualConnectionDialog.tsx (529 lines)

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

## 6. CablingFormFields.tsx (521 lines)

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
1. Start with connectionService.ts (highest impact on maintainability)
2. Then ComponentFormDialog.tsx (improves form maintainability)
3. Follow with RackLayoutsTab.tsx (reduces complexity)
4. Continue with remaining files in any order

Each refactoring can be done independently, but connectionService.ts should be prioritized due to its critical role in the application.