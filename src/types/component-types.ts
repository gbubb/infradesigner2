// Common component and UI types

import { ReactNode } from 'react';

// Recharts tooltip types
export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: any;
    value?: number;
    name?: string;
    dataKey?: string;
    color?: string;
  }>;
  label?: string;
}

// Chart data types
export interface ChartPayload {
  payload: Record<string, any>;
  value?: number;
  name?: string;
  dataKey?: string;
  color?: string;
}

// Form event types
export interface InputChangeEvent {
  target: {
    value: string;
  };
}

// Select change event types
export interface SelectChangeEvent {
  value: string;
}

// Component props
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

// Modal props
export interface ModalProps extends BaseComponentProps {
  open: boolean;
  onClose: () => void;
  title?: string;
}

// Table column types
export interface TableColumn<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

// Drag and drop types
export interface DragItem {
  id: string;
  type: string;
  index?: number;
  data?: any;
}

// Tree node types
export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  data?: any;
  expanded?: boolean;
  selected?: boolean;
}

// File upload types
export interface FileUploadEvent {
  target: {
    files: FileList | null;
  };
}

// Export event types
export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeHeaders?: boolean;
  filename?: string;
}

// Pagination types
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

// Sort types
export interface SortState {
  field: string;
  direction: 'asc' | 'desc';
}

// Filter types
export interface FilterState {
  field: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte';
  value: any;
}

// Search types
export interface SearchState {
  query: string;
  fields?: string[];
  caseSensitive?: boolean;
}

// Error boundary types
export interface ErrorInfo {
  componentStack: string;
}

// Animation types
export interface AnimationProps {
  duration?: number;
  delay?: number;
  easing?: string;
}

// Theme types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
}

// Notification types
export interface NotificationOptions {
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}