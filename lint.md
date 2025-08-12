# Lint Errors Summary

Total: **55 problems (48 errors, 7 warnings)** *(down from 83)*

## Progress Log

### Session 1 (Current)
- ✅ Fixed case block declaration in BomItemHoverCard.tsx (1 error)
- ✅ Fixed TypeScript any types in BomItemHoverCard.tsx (21 errors)
- ✅ Fixed TypeScript any types in ComputeStorageTable.tsx (6 errors) 
- ✅ Fixed TypeScript any types in CapacityAnalysisTab.tsx (4 errors)
- **Total fixed: 32 errors**
- **Remaining: 48 errors, 7 warnings**

## TypeScript Type Issues (76 errors)

### @typescript-eslint/no-explicit-any

#### Model & Datacenter Components
- **src/components/model/datacenter/DatacenterAnalyticsTab.tsx**
  - Line 90:22 - Unexpected any
  - Line 133:37 - Unexpected any

#### Results Components

##### BOM (Bill of Materials) Components
- **src/components/results/bom/BomItemHoverCard.tsx** (21 errors)
  - Lines 59:54, 60:67, 65:54, 66:67, 68:61, 69:69 - Unexpected any
  - Lines 76:76, 77:76, 78:74, 79:74 - Unexpected any
  - Lines 118:55, 119:68, 125:59, 126:62 - Unexpected any
  - Lines 130:50, 131:63, 146:44, 184:26, 187:58 - Unexpected any

- **src/components/results/bom/CablingTable.tsx**
  - Line 57:37 - Unexpected any

- **src/components/results/bom/ComputeStorageTable.tsx** (6 errors)
  - Lines 101:69, 102:98, 102:161 - Unexpected any
  - Lines 143:63, 144:92, 144:149 - Unexpected any

##### Results Tabs
- **src/components/results/tabs/BillOfMaterialsTab.tsx** (32 errors)
  - Lines 18:24, 27:39, 43:39, 45:42, 46:19, 49:47, 72:13 - Unexpected any
  - Lines 87:103, 88:43, 89:44, 90:38 - Unexpected any
  - Lines 176:31, 201:92, 202:39, 202:75, 203:35, 204:78 - Unexpected any
  - Lines 206:116, 208:86, 211:39, 211:71, 212:36, 212:73 - Unexpected any
  - Lines 213:44, 214:35, 215:42, 215:82, 216:41, 218:199 - Unexpected any

- **src/components/results/tabs/CapacityAnalysisTab.tsx** (4 errors)
  - Lines 56:30, 56:58, 57:33, 57:65 - Unexpected any

##### Pricing Components
- **src/components/results/tabs/pricing/PricingCurveChart.tsx**
  - Line 51:109 - Unexpected any

- **src/components/results/tabs/pricing/RatioPremiumChart.tsx**
  - Line 58:109 - Unexpected any

#### Sidebar Components
- **src/components/sidebar/dialogs/ComponentFormDialog.tsx** (3 errors)
  - Lines 106:46, 107:44, 108:45 - Unexpected any

#### Hooks
- **src/hooks/common/useLoadingSkeleton.tsx**
  - Line 58:27 - Unexpected any

- **src/hooks/queries/useSupabaseQueries.ts** (3 errors)
  - Lines 61:66, 90:54, 115:80 - Unexpected any

## Code Style Issues (1 error)

### no-case-declarations
- **src/components/results/bom/BomItemHoverCard.tsx**
  - Line 97:9 - Unexpected lexical declaration in case block

## React Warnings (7 warnings)

### React Hooks Dependencies
- **src/components/sidebar/tables/VirtualComponentsTable.tsx**
  - Line 36:9 - The 'handlePowerPrediction' function makes dependencies of useMemo Hook change on every render

### React Fast Refresh
- **src/components/ui/button.tsx**
  - Line 28:18 - Fast refresh only works when file only exports components

- **src/components/ui/toggle.tsx**
  - Line 22:18 - Fast refresh only works when file only exports components

- **src/context/ComponentContext.tsx**
  - Line 16:14 - Move React context(s) to a separate file

- **src/hooks/common/useLoadingSkeleton.tsx**
  - Lines 16:17, 54:17 - Fast refresh only works when file only exports components

- **src/hooks/useAuth.tsx**
  - Line 16:14 - Move React context(s) to a separate file

## Summary by Category

| Category | Count | Severity |
|----------|-------|----------|
| TypeScript `any` types | 75 | Error |
| Case block declarations | 1 | Error |
| React Hook dependencies | 1 | Warning |
| React Fast Refresh | 6 | Warning |

## Priority Fixes

### High Priority (Errors)
1. **TypeScript `any` types** - Replace with proper types for type safety
2. **Case block declaration** - Wrap case block in braces or move declaration

### Medium Priority (Warnings)
1. **React Hook dependencies** - Wrap function in useCallback
2. **React Fast Refresh** - Separate constants/functions from component files

## Most Affected Files
1. `BillOfMaterialsTab.tsx` - 32 errors (remaining)
2. ~~`BomItemHoverCard.tsx` - 21 errors~~ ✅ Fixed
3. ~~`ComputeStorageTable.tsx` - 6 errors~~ ✅ Fixed  
4. ~~`CapacityAnalysisTab.tsx` - 4 errors~~ ✅ Fixed
5. `ComponentFormDialog.tsx` - 3 errors (remaining)