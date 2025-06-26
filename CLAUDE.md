# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Network Infrastructure Design Tool that enables users to design, configure, and analyze data center and network infrastructure deployments. The application provides comprehensive features for component selection, rack layout visualization, cost analysis, power calculations, and design comparison.

## Development Commands

```bash
# Build for production
npm run build

# Run linting
npm run lint

```

## Testing Environment

**IMPORTANT**: No local development environment is available. Testing is only possible after commit and push to the repository. Always ensure code compiles and passes linting before committing.

## Architecture Overview

### Technology Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Zustand** for state management
- **Supabase** for authentication and database
- **shadcn-ui** components (Radix UI + Tailwind CSS)
- **React Router** for routing
- **React Hook Form + Zod** for forms and validation
- **TanStack Query** for data fetching
- **Recharts** for data visualization
- **React DND** for drag-and-drop functionality

### State Management Architecture

The application uses Zustand with a modular slice pattern:

1. **Requirements Slice** (`store/slices/requirementsSlice.ts`): Manages compute, storage, network, and physical requirements
2. **Design Slice** (`store/slices/design/`): Handles the current design state, placed components, and connections
3. **Component Library Slice** (`store/slices/componentLibrary/`): Manages available components and templates
4. **Workspace Slice** (`store/slices/workspaceSlice.ts`): Controls UI state and workspace interactions

Design calculations are automatically triggered by state changes through the calculation manager.

### Key Application Flows

1. **Design Calculation**: Requirements change → Role calculation → Component sizing → Cost/power analysis
2. **Data Persistence**: Design changes → Debounced save to Supabase → Shared via unique URL

### Component Types

The system supports these infrastructure components:
- **Compute**: Servers with CPU, memory, storage configurations
- **Network**: Switches, Routers, Firewalls with port configurations
- **Storage**: Disk arrays and storage systems
- **Cabling**: Fiber/Copper patch panels, cassettes, cables
- **Accessories**: Transceivers/Optics

### Important Services

- **Connection Service** (`services/connectionService.ts`): Manages network topology and connection rules
- **Placement Service** (`services/automatedPlacementService.ts`): Handles automatic rack placement
- **Design Calculator** (`store/calculations/designCalculator.ts`): Performs all design calculations
- **Component Service** (`services/componentService.ts`): CRUD operations for components

### Route Structure

- `/` - Requirements input panel
- `/components` - Component library management
- `/design` - Visual design workspace
- `/configure` - Connection rules and rack layouts
- `/results` - Analysis results and BOM
- `/compare` - Design comparison
- `/model` - Model analysis
- `/designs/:sharingId` - Shared design view

### Code Conventions

- Path alias `@/` maps to `./src/`
- Components use TypeScript with relaxed null checks
- Tailwind CSS for styling with custom design tokens
- Form validation uses Zod schemas
- API operations use TanStack Query hooks
- Component files follow PascalCase naming

## Detailed Architecture & Implementation

### Directory Structure
```
src/
├── components/        # UI components organized by feature
├── context/          # React context providers
├── data/             # Static data and constants
├── hooks/            # Custom React hooks
├── integrations/     # External service integrations (Supabase)
├── lib/              # Utilities and helpers
├── pages/            # Route pages/panels
├── services/         # Business logic and data operations
├── store/            # Zustand state management
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── workers/          # Web workers for background processing
```

### Data Flow Architecture

1. **User Input Flow**:
   - Requirements Entry → State Update → Intelligent Design Updater → Selective Recalculation → Auto-save

2. **Calculation Pipeline**:
   - Role Calculator → Quantity Calculator → Component Assignment → Placement Service → Connection Generation

3. **State Update Pattern**:
   - All state changes trigger automatic recalculations through the calculation manager
   - Intelligent updater performs selective updates to minimize recalculation overhead
   - Changes are debounced (500ms) before persisting to database

### Service Layer Details

#### Connection Management (`/services/connection/`)
- **ConnectionGenerator**: Creates network connections based on rules
- **CableManager**: Manages cable types and lengths
- **TransceiverManager**: Handles optic selection and compatibility
- **BreakoutManager**: Manages breakout cable configurations
- **ConnectionValidator**: Validates port compatibility and connections
- **PortMatcher**: Matches available ports for connections

#### Placement Services (`/services/placement/`)
- **computePlacement**: Places compute nodes with availability zone distribution
- **storageClusterPlacement**: Groups storage nodes into clusters
- **coreNetworkPlacement**: Places core network devices in dedicated racks

#### Datacenter Services (`/services/datacenter/`)
- **DatacenterCostCalculator**: Calculates facility and operational costs
- **PowerEfficiencyCalculator**: Computes PUE and power efficiency
- **CapacityManagementService**: Manages rack and facility capacity
- **RackPowerCalculationService**: Calculates per-rack power consumption

### Database Schema

Key tables with their purposes:
- `components`: Infrastructure component definitions
- `designs`: User-created designs (JSON structure)
- `facilities`: Datacenter facility configurations
- `facility_hierarchy`: Hierarchical datacenter structure (DC → Room → Row → Rack)
- `facility_power_layers`: Power distribution configurations
- `facility_cost_layers`: Cost allocation models
- `rack_profiles`: Rack specifications and constraints
- `profiles`: User profile information

### Performance Optimizations

1. **Selective Recalculation**: Change detection minimizes unnecessary updates
2. **Debouncing**: Form inputs (500ms), auto-save (500ms), search (300ms)
3. **Memoization**: Component filtering, calculation results, derived state
4. **Lazy Loading**: Tab content, large lists, chart data


### Common Workflows

1. **Adding New Features**:
   - Create new store slice if needed
   - Add service layer for business logic
   - Create UI components following existing patterns
   - Update routes and navigation
