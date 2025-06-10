# Datacenter Cost Modeling Implementation Plan

## Overview

This document outlines the plan to add comprehensive datacenter cost modeling functionality to the Network Infrastructure Design Tool. The feature will enable users to model the costs of owned datacenters, tracking both capital and operational expenses across multiple cost layers, and allocating these costs proportionally to rack capacity and power consumption.

## Background & Requirements

### Current State
- The application currently supports simple colocation pricing (fixed cost per rack)
- Power calculations exist at component/rack level but not facility level
- No facility-level cost modeling or PUE calculations
- Availability Zones exist but aren't tied to specific facilities

### Key Requirements
1. **Flexible Facility Hierarchy**: Support customizable organizational structures (e.g., Building → Floor → Hall → Pod → Row → Rack)
2. **Multi-Layer Power Infrastructure**: Model complete power path from grid to rack with capacity tracking at each layer
3. **Cost Layer Management**: Support different cost categories with varying amortization periods
4. **Proportional Cost Allocation**: Distribute costs based on both rack count and power capacity
5. **Capacity Visualization**: Identify bottlenecks and plan expansions
6. **Multi-Facility Support**: Model and compare multiple datacenter locations
7. **PUE Calculation**: Derive PUE from infrastructure efficiencies
8. **Integration Ready**: Design for future integration with existing TCO calculations

## Implementation Phases

### Phase 1: Core Data Structures & Types
**Status**: [✓] Completed

#### 1.1 Create Datacenter Type System
**Status**: [✓] Completed
**File**: `/src/types/infrastructure/datacenter-types.ts`

```typescript
// Key interfaces to define:
interface DatacenterFacility {
  id: string;
  name: string;
  location: string;
  hierarchyConfig: HierarchyLevel[];
  powerInfrastructure: PowerLayer[];
  costLayers: CostLayer[];
  constraints: FacilityConstraints;
}

interface HierarchyLevel {
  id: string;
  name: string; // e.g., "Building", "Floor", "Hall"
  parentId?: string;
  customAttributes?: Record<string, any>;
}

interface PowerLayer {
  id: string;
  name: string; // e.g., "Grid Input", "UPS", "PDU"
  capacityKW: number;
  efficiency: number; // 0-1 (e.g., 0.95 for 95% efficient)
  redundancyConfig?: RedundancyConfig;
  parentLayerId?: string;
}

interface CostLayer {
  id: string;
  name: string;
  type: 'capital' | 'operational';
  amount: number;
  currency: string;
  amortizationMonths?: number; // For capital costs
  frequency?: 'monthly' | 'annual'; // For operational costs
  allocationMethod: 'per-rack' | 'per-kw' | 'hybrid';
}
```

#### 1.2 Extend Database Schema
**Status**: [✓] Completed

Created migration file:
- `/supabase/migrations/add_facilities_tables.sql`
- Tables created:
  - `facilities` - Main facility configuration
  - `facility_power_layers` - Power infrastructure layers
  - `facility_cost_layers` - Cost tracking
  - `facility_hierarchy` - Flexible space hierarchy
  - `facility_non_productive_loads` - Non-IT loads
  - `facility_templates` - Reusable templates
  - `design_facility_mapping` - Design to facility mapping
  - Added RLS policies, indexes, triggers, and utility functions

### Phase 2: Datacenter Management Interface
**Status**: [✓] Completed

#### 2.1 Create Datacenter Panel
**Location**: `/src/components/datacenter/`

Components to create:
- [✓] `DatacenterPanel.tsx` - Main management interface
- [✓] `HierarchyBuilder.tsx` - Drag-drop hierarchy designer
- [✓] `PowerInfrastructureDesigner.tsx` - Power layer configuration
- [✓] `CostLayerManager.tsx` - Cost configuration interface

#### 2.2 Cost Layer Components
- [✓] Real Estate costs (30-50 year amortization)
- [✓] Building/Facility costs (15-25 years)
- [✓] Infrastructure costs (10-15 years)
- [✓] IT infrastructure (3-5 years)
- [✓] Operating expenses (monthly/annual)
- [ ] Non-productive loads interface

### Phase 3: Cost Allocation & Calculations
**Status**: [✓] Completed

#### 3.1 Create Cost Allocation Engine
**Location**: `/src/services/datacenter/`

Services to implement:
- [✓] `DatacenterCostCalculator.ts` - Core allocation logic
- [✓] `PowerEfficiencyCalculator.ts` - PUE and efficiency cascade
- [✓] `CapacityManagementService.ts` - Track utilization

Key algorithms:
```typescript
// Proportional allocation example
const rackCost = (rackPowerKW / totalPowerKW) * totalMonthlyCost;
const perKWCost = totalMonthlyCost / totalPowerKW;
```

#### 3.2 Integration with Existing Calculations
- [✓] Extend `useCostAnalysis.ts` to support facility costs
- [✓] Add facility cost option to `PhysicalConstraintsForm`
- [✓] Update cost breakdowns to show facility vs equipment costs

### Phase 4: Visualization & Analysis
**Status**: [✓] Completed

#### 4.1 Datacenter Analytics Tab
**Status**: [✓] Completed
**Location**: `/src/components/model/datacenter/`

Visualizations created:
- [✓] Cost breakdown by layer (stacked bar chart) - `CostBreakdownChart.tsx`
- [✓] Power capacity waterfall (showing bottlenecks) - `PowerCapacityWaterfall.tsx`
- [✓] Utilization heatmaps - `UtilizationHeatmap.tsx`
- [✓] Cost metrics dashboard ($/rack, $/kW) - `CostMetricsDashboard.tsx`
- [✓] PUE trending chart - `PUETrendingChart.tsx`

#### 4.2 Capacity Planning Views
**Status**: [✓] Completed
- [✓] Available vs allocated capacity by layer - `CapacityPlanningView.tsx`
- [✓] Growth projection overlays - Integrated in CapacityPlanningView
- [✓] Bottleneck identification alerts - Integrated in multiple components

### Phase 5: Multi-Facility Support
**Status**: [ ] Not Started

#### 5.1 Facility Library Management
- [ ] CRUD operations UI
- [ ] Template/clone functionality
- [ ] Import/export (JSON format)
- [ ] Facility comparison tool

#### 5.2 Cross-Facility Analysis
- [ ] Multi-facility cost comparison
- [ ] Workload distribution optimizer
- [ ] Geographic redundancy planner

## Technical Architecture

### State Management
```typescript
// New Zustand slices
facilitiesSlice: {
  facilities: DatacenterFacility[];
  selectedFacilityId: string | null;
  // CRUD actions
}

datacenterCostsSlice: {
  costCalculations: FacilityCostBreakdown[];
  allocationSettings: AllocationConfig;
  // Calculation actions
}
```

### Component Integration Points

1. **Requirements Panel**: 
   - Modify `PhysicalConstraintsForm` to include facility selection
   - Add radio options: None / Colocation / Owned Facility

2. **Model Panel**:
   - Add new "Datacenter" tab
   - Include cost analysis and capacity views

3. **Results Panel**:
   - Extend cost breakdowns to show facility costs
   - Add datacenter utilization metrics

### API Endpoints (Future)
```typescript
// Facility management
POST   /api/facilities
GET    /api/facilities
PUT    /api/facilities/:id
DELETE /api/facilities/:id

// Cost calculations
POST   /api/facilities/:id/calculate-costs
GET    /api/facilities/:id/utilization
```

## Migration Strategy

1. **Backward Compatibility**: Existing designs continue using colocation pricing
2. **Opt-in Feature**: New facility modeling is optional
3. **Data Migration**: No changes to existing design data
4. **Gradual Rollout**: Feature flag for beta testing

## Success Metrics

- [ ] Users can create facilities with custom hierarchies
- [ ] Power infrastructure accurately models capacity constraints
- [ ] Cost allocation provides clear $/rack and $/kW metrics
- [ ] PUE calculations match real-world expectations
- [ ] Visualizations clearly show bottlenecks and costs
- [ ] Multi-facility comparison enables optimization decisions

## Future Enhancements

1. **Integration with Design Placement**
   - Auto-assign designs to specific facility locations
   - Enforce facility-specific constraints

2. **Advanced Modeling**
   - Cooling zone modeling
   - Network connectivity costs between facilities
   - Disaster recovery scenarios

3. **External Integrations**
   - Import facility data from DCIM systems
   - Export to financial planning tools
   - Real-time power monitoring integration

## Development Notes

### Key Files to Reference
- `/src/hooks/design/useCostAnalysis.ts` - Current cost calculation logic
- `/src/components/requirements/PhysicalConstraintsForm.tsx` - Where to add facility selection
- `/src/components/model/ModelPanel.tsx` - Where to add datacenter tab
- `/src/types/infrastructure/` - Existing type definitions

### Design Patterns to Follow
- Use Zustand slices for state management
- Implement services in `/src/services/`
- Use Zod for validation schemas
- Follow existing UI patterns with shadcn components
- Maintain TypeScript strict mode compatibility

### Testing Considerations
- Unit tests for cost allocation algorithms
- Integration tests for facility CRUD operations
- E2E tests for complete facility → design → cost flow
- Performance tests for large facility hierarchies

---

**Last Updated**: 2025-01-10
**Status**: Phase 1, 2, 3 & 4 Completed, Phase 5 Ready to Start
**Next Steps**: Begin Phase 5 - Multi-Facility Support