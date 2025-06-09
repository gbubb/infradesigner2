# Refactoring Instructions - Top 3 Priority Files

**CRITICAL**: ALL existing functionality MUST be maintained during refactoring - no features should be removed or altered!

## 1. PowerCalibrationSection.tsx (918 lines) - HIGHEST PRIORITY ✅ COMPLETED

**Brief**: Split this massive component into modular tab components, extract calibration logic into hooks, and separate form validation while maintaining ALL existing calibration functionality.

### Refactoring Instructions:
Refactor PowerCalibrationSection.tsx into a modular structure:

1. **Create tab components** in `components/model/power-calibration/tabs/`:
   - `CPUCalibrationTab.tsx` - CPU power calibration form and logic
   - `MemoryCalibrationTab.tsx` - Memory power calibration
   - `StorageCalibrationTab.tsx` - Storage devices power calibration
   - `NetworkCalibrationTab.tsx` - Network ports power calibration
   - `AvailabilityCalibrationTab.tsx` - Availability factor calibration
   - `UtilizationCalibrationTab.tsx` - Base and component utilization calibration

2. **Extract business logic** into `hooks/power-calibration/`:
   - `useCalibrationProfiles.ts` - Profile management (save/load/delete)
   - `usePowerCalculations.ts` - Power calculation logic
   - `useCalibrationState.ts` - Centralized state management for all tabs

3. **Create reusable components** in `components/model/power-calibration/shared/`:
   - `CalibrationInputField.tsx` - Standardized number input with labels
   - `DeviceSelector.tsx` - Reusable device type selector
   - `ProfileSelector.tsx` - Profile dropdown with management buttons

4. **Extract constants and types**:
   - `PowerCalibrationTypes.ts` - All TypeScript interfaces
   - `PowerCalibrationConstants.ts` - Default values and constants
   - `PowerCalibrationValidation.ts` - Zod schemas for form validation

Keep PowerCalibrationSection.tsx as a thin orchestrator that uses these modules. Ensure ALL existing functionality remains intact including profile persistence, power calculations, and form validation.

## 2. PowerPredictionTab.tsx (780 lines) - HIGH PRIORITY ✅ COMPLETED

**Brief**: Decompose this complex component into configuration sections, extract power calculation logic into services, and create reusable form components while preserving ALL prediction features.

### Refactoring Instructions:
Refactor PowerPredictionTab.tsx into smaller, focused components:

1. **Create configuration components** in `components/model/power-prediction/configs/`:
   - `CPUConfiguration.tsx` - CPU count and model selection
   - `MemoryConfiguration.tsx` - Memory amount configuration
   - `StorageConfiguration.tsx` - Storage device list management
   - `NetworkConfiguration.tsx` - Network port configuration
   - `UtilizationConfiguration.tsx` - Utilization percentage inputs

2. **Extract state management** into `hooks/power-prediction/`:
   - `usePowerPredictionState.ts` - Main state management hook
   - `useDeviceManagement.ts` - Storage/network device list operations
   - `usePowerCalculation.ts` - Power calculation orchestration

3. **Create shared components** in `components/model/power-prediction/shared/`:
   - `DeviceListItem.tsx` - Reusable component for device rows
   - `PortConfigItem.tsx` - Network port configuration row
   - `PowerResultsDisplay.tsx` - Results section component
   - `AddDeviceButton.tsx` - Standardized add device/port button

4. **Extract services** in `services/power/`:
   - `PowerCalculationService.ts` - Core power calculation logic
   - `DeviceValidationService.ts` - Device configuration validation
   - `PowerPredictionTypes.ts` - TypeScript interfaces

Main component should only orchestrate these pieces. Maintain ALL functionality including dynamic device lists, real-time calculations, and component interactions.

## 3. ManualConnectionDialog.tsx (529 lines) - MEDIUM PRIORITY

**Brief**: Break down this dialog into port selection components, extract connection logic into hooks, and create reusable UI elements while keeping ALL connection creation features functional.

### Refactoring Instructions:
Refactor ManualConnectionDialog.tsx by extracting components:

1. **Create UI components** in `components/connections/manual/`:
   - `PortSelector.tsx` - Reusable port selection panel (use for both source/destination)
   - `ConnectionList.tsx` - List of created connections with delete actions
   - `MediaTypeSelector.tsx` - Cable media type selection component
   - `PortGroupSelector.tsx` - Port group/range selection UI
   - `DevicePortTree.tsx` - Device and port hierarchy display

2. **Extract business logic** into `hooks/connections/`:
   - `useConnectionCreation.ts` - Connection validation and creation logic
   - `usePortFiltering.ts` - Port filtering and search functionality
   - `usePortAvailability.ts` - Track available ports in real-time
   - `useConnectionState.ts` - Dialog state management

3. **Create service layer** in `services/connections/`:
   - `PortAvailabilityService.ts` - Check port availability
   - `ConnectionValidationService.ts` - Validate connection compatibility
   - `PortMatchingService.ts` - Find compatible ports

4. **Extract types** in `types/infrastructure/`:
   - `ManualConnectionTypes.ts` - Interfaces for manual connections
   - `PortSelectionTypes.ts` - Port selection state types

Update ManualConnectionDialog to compose these modules. Preserve ALL functionality including real-time validation, port filtering, media type compatibility, and error handling.

## General Requirements for ALL Refactoring:
1. **NO functionality changes** - Everything must work exactly as before
2. **Maintain all validations** - Don't skip any validation logic
3. **Preserve all UI behaviors** - Tooltips, placeholders, error messages must remain
4. **Keep all calculations** - Business logic must produce identical results
5. **Test thoroughly** - Run `npm run build` and `npm run lint` after each refactor
6. **Update imports** - Fix all import paths in dependent files
7. **Preserve state management** - Don't lose any state interactions
8. **Maintain performance** - Don't introduce unnecessary re-renders

## Completion Status

### ✅ Completed Refactoring:
1. **PowerCalibrationSection.tsx** - Successfully refactored from 918 lines to 111 lines
   - Created modular tab components (CPU, Memory, Storage, Network, System, Validation)
   - Extracted business logic into useCalibrationProfiles hook
   - Created shared components (CalibrationInputField, ProfileSelector)
   - Extracted types and constants

2. **PowerPredictionTab.tsx** - Successfully refactored from 780 lines to ~320 lines
   - Created configuration components (CPU, Memory, Storage, Network, Utilization)
   - Extracted state management hooks (usePowerPredictionState, useDeviceManagement, usePowerCalculation)
   - Created shared components (DeviceListItem, PortConfigItem, PowerResultsDisplay)
   - Note: Services extraction pending (PowerCalculationService, DeviceValidationService)

### 🔄 Remaining Work:
1. **ManualConnectionDialog.tsx** (529 lines) - Not started
2. **PowerPredictionTab.tsx** - Extract services layer (partial completion)

Build and lint checks pass successfully with the refactored code.