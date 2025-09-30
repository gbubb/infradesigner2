# VM Cost Scaling Analysis - Accurate Simulation Plan

## Problem Statement

The current implementation extrapolates costs linearly, which produces dramatically incorrect results (e.g., 12 nodes @ $30.99/VM extrapolated to 204 nodes predicts $1.82/VM, but manual testing shows $8.22/VM - a 4.5x error).

**Root Cause**: Infrastructure costs don't scale linearly. When scaling from 12→204 nodes:
- Rack quantity increases (more facility costs)
- Network switches may increase (port density limits)
- Power infrastructure scales with total consumption
- Component amortization distributes differently

**Solution**: Perform actual design recalculation for each scale point, simulating what happens when users manually adjust requirements.

## Feature Requirements

### User Experience
1. User configures scaling parameters in dialog:
   - Select compute cluster (if multiple exist)
   - Set min/max node count range
   - Set increment step size
   - Click "Generate Analysis" button

2. System displays progress indicator showing:
   - "Simulating X of Y configurations..."
   - Current node count being calculated
   - Estimated time remaining

3. Chart displays after all simulations complete:
   - Cost-per-VM vs node count
   - VM capacity vs node count
   - Current design marked with reference line
   - Accurate cost data matching manual requirement changes

4. Time expectation: 30-60 seconds for 50 data points

### Technical Requirements
- Each data point must match what would happen if user changed requirements manually
- Full design recalculation pipeline for each scale point
- No state mutations (isolated simulations)
- Cancellable operation
- Error handling for failed simulations

## Architecture Design

### Core Components

#### 1. Design Simulation Service (`src/services/designSimulationService.ts`)
**Purpose**: Orchestrate isolated design calculations without mutating store state

**Key Functions**:
```typescript
// Clone and modify requirements for target node count
cloneAndModifyRequirements(
  baseRequirements: DesignRequirements,
  clusterId: string,
  targetNodeCount: number
): DesignRequirements

// Run full calculation pipeline in isolation
simulateDesignConfiguration(
  requirements: DesignRequirements,
  componentTemplates: ComponentTemplate[],
  existingAssignments: RoleAssignmentMap
): SimulationResult

// Calculate what totalVCPUs requirement produces target node count
reverseEngineerVCPURequirement(
  targetNodes: number,
  redundancy: string,
  overcommit: number,
  totalAZs: number
): number
```

**Simulation Pipeline**:
1. Clone requirements object (deep copy)
2. Modify target cluster's `totalVCPUs` to achieve desired node count
3. Calculate component roles with modified requirements
4. Apply existing component assignments (preserve user selections)
5. Calculate quantities for each role
6. Generate component instances
7. Calculate rack requirements
8. Calculate network switch requirements
9. Calculate power consumption
10. Run cost analysis (capital + operational)
11. Extract cost-per-VM metrics
12. Return structured result

#### 2. Async Scaling Hook (`src/hooks/design/useVMCostScalingAsync.ts`)
**Purpose**: Manage async simulation execution with progress tracking

**State Management**:
```typescript
{
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled',
  progress: { current: number, total: number },
  currentNodeCount: number | null,
  results: SimulationResult[],
  error: string | null
}
```

**Key Functions**:
```typescript
startSimulation(config: ScalingConfig): Promise<void>
cancelSimulation(): void
resetSimulation(): void
```

**Implementation**:
- Use `useState` for progress tracking
- Use `useCallback` for simulation control
- Process simulations sequentially (not parallel) to avoid resource contention
- Update progress after each simulation completes
- Support cancellation via AbortController pattern

#### 3. Updated Chart Component (`src/components/results/VMCostScalingChart.tsx`)
**Enhancements**:
- Accept `SimulationResult[]` as data
- Display additional metrics (racks, switches, power)
- Show infrastructure scaling alongside cost scaling
- Tooltip shows full breakdown per configuration

#### 4. Updated Dialog Component (`src/components/results/VMCostScalingDialog.tsx`)
**New Features**:
- "Generate Analysis" button (replaces live calculation)
- Progress indicator during simulation
- Cancel button while running
- Disabled configuration controls while running
- Success/error states
- Retry on failure

## Implementation Tasks

### Phase 1: Simulation Service Foundation
**File**: `src/services/designSimulationService.ts`

- [ ] **Task 1.1**: Implement `cloneAndModifyRequirements()`
  - Deep clone `DesignRequirements` object
  - Find target compute cluster by ID
  - Calculate target `totalVCPUs` using reverse engineering formula
  - Update cluster's `totalVCPUs` in cloned requirements
  - Return modified requirements object

- [ ] **Task 1.2**: Implement `reverseEngineerVCPURequirement()`
  - Input: target node count, redundancy config, overcommit, AZ count
  - Calculate redundancy overhead (N+1, N+2, fixed nodes)
  - Work backwards: target - redundancy = base nodes
  - Calculate base nodes → physical cores needed
  - Apply overcommit ratio: cores × overcommit = vCPUs
  - Return vCPU requirement

- [ ] **Task 1.3**: Implement `simulateDesignConfiguration()`
  - Accept: requirements, component templates, role assignments
  - Call `calculateComponentRoles()` with modified requirements
  - Apply existing component assignments to preserve user selections
  - Call `calculateRequiredQuantity()` for each role
  - Count resulting infrastructure:
    - Total compute/storage nodes
    - Estimate rack quantity (nodes per rack calculation)
    - Network switches (from requirements topology)
    - Total power consumption
  - Run cost calculation:
    - Component capital costs (from templates)
    - Amortization (using lifespan from requirements)
    - Facility costs (rack count × rack cost)
    - Energy costs (power × energy rate)
  - Calculate VM metrics:
    - Total/usable vCPUs (with redundancy)
    - Total/usable memory
    - Max VM count
    - Cost per VM
  - Return structured `SimulationResult`

### Phase 2: Cost Calculation Integration
**Files**: Leverage existing services

- [ ] **Task 2.1**: Create cost calculation helper for simulations
  - Extract cost logic from `useCostAnalysis` into pure function
  - Input: components, racks, power, requirements, templates
  - Output: capital cost, monthly operational cost, amortization
  - Handle facility costs (colocation vs owned)
  - Handle energy costs with PUE

- [ ] **Task 2.2**: Create rack calculation helper
  - Input: component list with RU sizes
  - Output: rack quantity needed
  - Account for network core racks
  - Account for RU overhead (power, cabling)

- [ ] **Task 2.3**: Create power calculation helper
  - Input: component list with power specs
  - Output: total power consumption
  - Apply PUE multiplier
  - Calculate energy cost per month

### Phase 3: Async Hook Implementation
**File**: `src/hooks/design/useVMCostScalingAsync.ts`

- [ ] **Task 3.1**: Create state management structure
  - Define state interface
  - Initialize with `useState`
  - Create state update functions

- [ ] **Task 3.2**: Implement `startSimulation()`
  - Validate configuration
  - Get current store state (requirements, templates, assignments)
  - Generate array of target node counts (min → max, step by increment)
  - Set status to 'running'
  - Loop through each target node count:
    - Update progress state
    - Call `simulateDesignConfiguration()`
    - Store result
    - Check for cancellation
    - Add small delay (10ms) to allow UI updates
  - Set status to 'completed'
  - Handle errors gracefully

- [ ] **Task 3.3**: Implement `cancelSimulation()`
  - Set cancellation flag
  - Update status to 'cancelled'
  - Clean up partial results

- [ ] **Task 3.4**: Implement `resetSimulation()`
  - Clear results
  - Reset progress
  - Set status to 'idle'

### Phase 4: UI Components Update
**Files**: Chart and Dialog components

- [ ] **Task 4.1**: Update `VMCostScalingDialog.tsx`
  - Add simulation state integration
  - Add "Generate Analysis" button
  - Add progress indicator component:
    - Progress bar
    - "Simulating X of Y configurations"
    - Current node count being processed
    - Estimated time remaining
  - Add cancel button during simulation
  - Disable configuration controls while running
  - Show chart only after completion
  - Add retry button on error

- [ ] **Task 4.2**: Update `VMCostScalingChart.tsx`
  - Accept `SimulationResult[]` type
  - Add infrastructure metrics to tooltip:
    - Rack count
    - Total power
    - Network switches count
  - Add secondary chart showing infrastructure scaling
  - Keep existing cost/capacity visualization

- [ ] **Task 4.3**: Create progress indicator component
  - Dedicated component: `VMScalingProgress.tsx`
  - Progress bar with percentage
  - Status text
  - Current configuration being simulated
  - Cancel button
  - Estimated time (based on average time per sim)

### Phase 5: Testing & Validation
**Testing Strategy**

- [ ] **Task 5.1**: Unit test simulation service
  - Test `reverseEngineerVCPURequirement()` with various configs
  - Test `cloneAndModifyRequirements()` doesn't mutate original
  - Test `simulateDesignConfiguration()` with known inputs

- [ ] **Task 5.2**: Integration testing
  - Test against current design: ensure current node count produces matching cost
  - Test against manual requirement changes:
    - Manually set 12 nodes, record cost
    - Manually set 50 nodes, record cost
    - Manually set 204 nodes, record cost
    - Run simulation, verify results match manual tests

- [ ] **Task 5.3**: Edge case testing
  - Min nodes = redundancy minimum
  - Max nodes = very large (500+)
  - Single node clusters
  - Multi-cluster designs
  - Hyper-converged clusters
  - Different redundancy configurations

- [ ] **Task 5.4**: Performance testing
  - Measure time per simulation
  - Test with 50+ data points
  - Ensure UI remains responsive
  - Test cancellation works quickly

### Phase 6: Documentation & Polish

- [ ] **Task 6.1**: Add inline documentation
  - Document simulation pipeline
  - Document reverse engineering formula
  - Document assumptions and limitations

- [ ] **Task 6.2**: Add user-facing help text
  - Explain what simulation does
  - Explain time expectations
  - Explain accuracy vs manual changes

- [ ] **Task 6.3**: Error handling polish
  - Graceful degradation on simulation failure
  - Clear error messages
  - Partial results display if some sims fail

## Technical Considerations

### Performance Optimizations
- Sequential processing (not parallel) to avoid memory issues
- Results caching by configuration hash
- Incremental UI updates (every simulation, not just at end)
- Cancel support for long-running operations

### Accuracy Guarantees
- Use exact same calculation functions as main design pipeline
- No approximations or extrapolations
- Match manual requirement changes 100%
- Validate against test cases

### State Isolation
- No mutations of main store during simulation
- Cloned requirements objects
- Isolated calculation context
- Results stored in component state only

### Error Handling
- Try-catch around each simulation
- Continue on individual failures
- Report which configurations failed
- Allow retry of failed simulations

## Success Criteria

✅ Simulation results match manual requirement changes within 1% margin
✅ Progress indicator updates smoothly every 500ms
✅ Cancellation responds within 100ms
✅ No memory leaks during long simulations
✅ Chart displays accurate infrastructure scaling
✅ User can generate 50 data points in under 60 seconds
✅ Errors are handled gracefully with clear messages

## File Structure

```
src/
├── services/
│   └── designSimulationService.ts          [NEW - ~400 lines]
├── hooks/design/
│   ├── useVMCostScalingAsync.ts            [NEW - ~200 lines]
│   └── useVMCostScaling.ts                 [REMOVE - replaced]
├── components/results/
│   ├── VMCostScalingChart.tsx              [MODIFY - +50 lines]
│   ├── VMCostScalingDialog.tsx             [MODIFY - +100 lines]
│   └── VMScalingProgress.tsx               [NEW - ~80 lines]
└── lib/
    └── costCalculationHelpers.ts           [NEW - ~300 lines]
```

## Estimated Effort

- Phase 1: 4-6 hours (simulation service core)
- Phase 2: 2-3 hours (cost calculation extraction)
- Phase 3: 3-4 hours (async hook)
- Phase 4: 3-4 hours (UI updates)
- Phase 5: 4-5 hours (testing & validation)
- Phase 6: 1-2 hours (polish)

**Total**: 17-24 hours of focused development