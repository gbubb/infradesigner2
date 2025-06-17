# Datacenter-Rack Integration Implementation TODO

## Phase 1: Database & Types Foundation

### 1.1 Create Database Migration
- [ ] Create `/supabase/migrations/addRackFacilityIntegration.sql`
  - Add facilityId, hierarchyLevelId, positionInLevel, physicalLocation to rack_profiles
  - Create rack_hierarchy_assignments table with proper indexes
  - Add assignedRacks and actualPowerKw to facility_hierarchy
  - Add RLS policies for new tables/columns
  - Add triggers to maintain assignment counts

### 1.2 Update Type Definitions
- [ ] Update `/src/types/infrastructure/rack-types.ts`
  - Add facility integration fields to RackProfile
  - Create RackHierarchyAssignment interface
  - Add PhysicalLocation type
- [ ] Update `/src/types/infrastructure/datacenter-types.ts`
  - Add rack tracking fields to HierarchyLevel
  - Create FacilityRackStats interface
  - Add RackAssignmentError type for validation

## Phase 2: Service Layer

### 2.1 Create Integration Service
- [ ] Create `/src/services/datacenter/RackFacilityIntegrationService.ts`
  ```typescript
  // Core methods to implement:
  - assignRackToHierarchy() - with capacity validation
  - unassignRackFromFacility() - cascade updates
  - moveRackToLevel() - validate and update
  - validateRackAssignment() - check all constraints
  - getRacksByHierarchyLevel() - efficient query
  - calculateHierarchyUtilization() - rollup stats
  - bulkAssignRacks() - transaction-based
  - getAvailablePositions() - for a given level
  ```

### 2.2 Update Existing Services
- [ ] Update `/src/services/rackService.ts`
  - Add getUnassignedRacks()
  - Add getRacksByFacility()
  - Modify createRack() to accept facility context
  - Update deleteRack() to handle assignments
- [ ] Update `/src/services/datacenter/DatacenterCostCalculator.ts`
  - Use actual rack assignments for cost allocation
  - Add method to calculate costs by hierarchy path

## Phase 3: Store Integration

### 3.1 Enhance Facilities Slice
- [ ] Update `/src/store/slices/facilitiesSlice.ts`
  ```typescript
  // Add to state:
  - rackAssignments: Map<rackId, RackHierarchyAssignment>
  - facilityRackStats: Map<facilityId, FacilityRackStats>
  - assignmentLoading: boolean
  
  // Add actions:
  - loadRackAssignments(facilityId)
  - assignRacksToLevel(rackIds[], levelId)
  - unassignRacks(rackIds[])
  - moveRacksBetweenLevels(rackIds[], fromLevel, toLevel)
  - refreshFacilityStats(facilityId)
  ```

### 3.2 Update Design Store
- [ ] Modify `/src/store/slices/design/index.ts`
  - Add facilityContext to rack operations
  - Sync assignments when racks are added/removed
  - Add validation against facility constraints

## Phase 4: UI Components

### 4.1 Create Assignment Panel
- [ ] Create `/src/components/datacenter/rackAssignment/RackAssignmentPanel.tsx`
  - Left panel: Unassigned racks list with search/filter
  - Right panel: Facility hierarchy tree
  - Drag-drop functionality using existing DND setup
  - Bulk selection with checkboxes
  - Assignment validation feedback

### 4.2 Create Supporting Components
- [ ] Create `/src/components/datacenter/rackAssignment/RackAssignmentItem.tsx`
  - Draggable rack card with key details
  - Visual indicators for power/space requirements
- [ ] Create `/src/components/datacenter/rackAssignment/HierarchyDropZone.tsx`
  - Drop targets on hierarchy levels
  - Capacity indicators and validation
- [ ] Create `/src/components/datacenter/rackAssignment/AssignmentConfirmDialog.tsx`
  - Confirm bulk assignments
  - Show impact on capacity

### 4.3 Enhance Existing Components
- [ ] Update `/src/components/datacenter/HierarchyBuilder.tsx`
  - Add rack count badges
  - Show utilization progress bars
  - Add context menu for quick actions
- [ ] Update `/src/components/datacenter/DatacenterPanel.tsx`
  - Add "Rack Assignment" tab
  - Show facility-wide statistics

### 4.4 Create Visualizations
- [ ] Create `/src/components/datacenter/visualization/RackUtilizationChart.tsx`
  - Hierarchy-based utilization treemap
  - Drill-down capabilities
- [ ] Create `/src/components/datacenter/visualization/RackDistributionView.tsx`
  - Visual rack layout by hierarchy level
  - Color coding by utilization

## Phase 5: Integration Points

### 5.1 Results Panel Integration
- [ ] Update `/src/components/results/tabs/RackLayoutsTab.tsx`
  - Show facility assignment info
  - Add facility/hierarchy filters
  - Group by hierarchy in export

### 5.2 Model Panel Integration
- [ ] Update `/src/components/model/datacenter/DatacenterAnalyticsTab.tsx`
  - Show actual vs planned capacity
  - Add rack distribution metrics
  - Update cost calculations to use assignments

### 5.3 Requirements Integration
- [ ] Update `/src/components/requirements/PhysicalConstraintsForm.tsx`
  - Add facility selector when "Owned Facility" is chosen
  - Auto-populate constraints from selected facility
  - Show available capacity

## Phase 6: Testing & Polish

### 6.1 Add Validation & Error Handling
- [ ] Implement comprehensive error handling in all services
- [ ] Add loading states and optimistic updates
- [ ] Create user-friendly error messages

### 6.2 Performance Optimization
- [ ] Implement virtual scrolling for large rack lists
- [ ] Add debouncing to assignment operations
- [ ] Cache hierarchy calculations

### 6.3 Documentation
- [ ] Update DATACENTER_MODELING_PLAN.md with completion status
- [ ] Update CLAUDE.md with CamelCase preference
- [ ] Add inline documentation to new components
- [ ] Create migration guide for existing designs

## Implementation Notes

### Key Context:
1. **Existing Rack System**: Located in `/src/services/rackService.ts` and `/src/types/infrastructure/rack-types.ts`
2. **Datacenter System**: New feature in `/src/components/datacenter/` and `/src/types/infrastructure/datacenter-types.ts`
3. **State Management**: Uses Zustand with slice pattern
4. **Database**: Supabase with RLS policies
5. **UI Framework**: shadcn components with Tailwind
6. **Naming Convention**: Use CamelCase for all new files and folders

### Critical Paths:
- Database migration must handle existing racks gracefully
- Assignment operations need proper transaction handling
- UI must remain responsive with large datasets
- Cost calculations need to remain accurate

### Dependencies:
- Existing DND system for drag-drop
- Current rack visualization components
- Facility hierarchy already implemented
- Cost calculation framework in place

### CLAUDE.md Update:
Add to code conventions section:
```markdown
### Code Conventions

- Path alias `@/` maps to `./src/`
- Components use TypeScript with relaxed null checks
- Tailwind CSS for styling with custom design tokens
- Form validation uses Zod schemas
- API operations use TanStack Query hooks
- **File and folder naming**: Use CamelCase for all new files and folders (e.g., `RackAssignmentPanel.tsx`, `/rackAssignment/`)
- Component files follow PascalCase naming
```