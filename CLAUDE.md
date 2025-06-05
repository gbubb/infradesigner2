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

1. **Component Placement**: Drag components from palette to workspace → Automatic rack placement → Connection rule application
2. **Design Calculation**: Requirements change → Role calculation → Component sizing → Cost/power analysis
3. **Data Persistence**: Design changes → Debounced save to Supabase → Shared via unique URL

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
