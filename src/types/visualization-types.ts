// Visualization component types

import { InfrastructureComponent } from './infrastructure';
import { RackProfile, PlacedDevice } from './infrastructure/rack-types';

// Drag and drop types
export interface DraggableComponent {
  id: string;
  type: string;
  component: InfrastructureComponent;
  index?: number;
}

export interface DropResult {
  rackId: string;
  uPosition: number;
}

export interface DragSourceProps {
  component: InfrastructureComponent;
  children: React.ReactNode;
  onDragEnd?: () => void;
}

export interface DropTargetProps {
  rackId: string;
  uPosition: number;
  height: number;
  onDrop: (componentId: string, rackId: string, uPosition: number) => void;
  children?: React.ReactNode;
}

// Rack visualization types
export interface RackSlotProps {
  uPosition: number;
  device?: PlacedDevice;
  component?: InfrastructureComponent;
  isOccupied: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
}

export interface RackVisualizationProps {
  rack: RackProfile;
  components: InfrastructureComponent[];
  selectedDeviceId?: string;
  onDeviceSelect?: (deviceId: string) => void;
  onDeviceRemove?: (deviceId: string) => void;
  interactive?: boolean;
}

// Connection types
export interface ConnectionPoint {
  componentId: string;
  portId: string;
  position: { x: number; y: number };
}

export interface VisualConnection {
  id: string;
  source: ConnectionPoint;
  target: ConnectionPoint;
  type: 'fiber' | 'copper' | 'power';
  status?: 'active' | 'inactive' | 'error';
}

// Layout types
export interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComponentLayout {
  componentId: string;
  position: LayoutPosition;
  rotation?: number;
  zIndex?: number;
}

// Tooltip types
export interface TooltipData {
  component?: InfrastructureComponent;
  rack?: RackProfile;
  connection?: VisualConnection;
  position: { x: number; y: number };
}

// Zoom and pan types
export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

// Selection types
export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Animation types
export interface AnimationState {
  isAnimating: boolean;
  duration: number;
  easing: string;
}

// Filter types
export interface VisualizationFilters {
  showLabels: boolean;
  showConnections: boolean;
  showPowerInfo: boolean;
  componentTypes?: string[];
  searchQuery?: string;
}

// Event handlers
export type ComponentClickHandler = (component: InfrastructureComponent) => void;
export type RackClickHandler = (rack: RackProfile) => void;
export type ConnectionClickHandler = (connection: VisualConnection) => void;
export type EmptySpaceClickHandler = (position: { x: number; y: number }) => void;

// Export types
export interface ExportImageOptions {
  format: 'png' | 'svg' | 'pdf';
  scale: number;
  backgroundColor?: string;
  includeLabels?: boolean;
}