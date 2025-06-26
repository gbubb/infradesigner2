# React Hooks Exhaustive Dependencies Fixes

This document summarizes the react-hooks/exhaustive-deps warnings that were fixed.

## Files Fixed

### 1. src/components/datacenter/RackAssignment/RackCostVisualization.tsx
- **Line 38**: Missing dependency 'loadRackCosts'
- **Fix**: Moved `loadRackCosts` function inside the useEffect to avoid dependency issues

### 2. src/components/datacenter/RackDefinition/RackDefinitionPanel.tsx
- **Line 39**: Missing dependency 'loadDatacenterRacks'
- **Fix**: Moved `loadDatacenterRacks` function inside the useEffect and replaced calls with inline code

### 3. src/components/datacenter/RackMapping/RackMappingPanel.tsx
- **Lines 42, 48, 54**: Missing dependencies 'loadAllFacilityRacks', 'loadDatacenterRacks', 'loadDesignRacks'
- **Fix**: Moved all three functions inside their respective useEffects and replaced external calls with inline code

### 4. src/components/design/CalculationBreakdown.tsx
- **Line 84**: Missing dependencies 'calculateRequiredQuantity', 'generateDetailedBreakdown', and 'role'
- **Fix**: Moved both functions inside the useEffect and added all required dependencies to the dependency array

### 5. src/components/design/DesignPanel.tsx
- **Line 104**: Missing dependency 'getComponentsForRole'
- **Fix**: Wrapped `getComponentsForRole` in useCallback with componentTemplates as dependency, and fixed parsing error by removing orphaned code

### 6. src/components/layout/header/DesignTitle.tsx
- **Line 19**: Missing dependency 'activeDesign'
- **Fix**: Changed dependency from `activeDesign?.id, activeDesign?.name` to just `activeDesign`

### 7. src/components/model/ModelPanel.tsx
- **Line 343**: Missing dependencies in useMemo
- **Fix**: Added missing dependencies: `activeDesign?.components`, `activeDesign?.requirements?.computeRequirements?.deviceLifespanYears`, and `activeDesign?.requirements?.storageRequirements?.deviceLifespanYears`

### 8. src/components/requirements/NetworkRequirementsForm.tsx
- **Line 23**: Missing dependencies 'onUpdate' and 'requirements'
- **Fix**: Added both dependencies to the useEffect dependency array

### 9. src/components/requirements/PhysicalConstraintsForm.tsx
- **Line 125**: Missing dependency 'onUpdate'
- **Fix**: Added 'onUpdate' to the useEffect dependency array

## Best Practices Applied

1. **Function definitions inside useEffect**: When a function is only used within a useEffect and causes dependency warnings, it's often better to define it inside the useEffect.

2. **useCallback for shared functions**: When a function needs to be used in multiple places including as a dependency, wrap it in useCallback.

3. **Complete dependency arrays**: Always include all variables and functions that are used inside hooks in their dependency arrays.

4. **Avoid function references as dependencies**: Functions defined in the component body change on every render, causing unnecessary re-runs. Either define them inside the effect or wrap in useCallback.