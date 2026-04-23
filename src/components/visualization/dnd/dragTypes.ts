// Shared drag type constants for @dnd-kit draggables. Kept as string literals
// so they appear verbatim in `active.data.current.type` for onDragEnd dispatch.
export const DragType = {
  PaletteComponent: "PALETTE_COMPONENT",
  PlacedDevice: "PLACED_DEVICE",
  HierarchyLevel: "HIERARCHY_LEVEL",
  RowLayoutRack: "ROW_LAYOUT_RACK",
} as const;

export type DragType = (typeof DragType)[keyof typeof DragType];

export const DropType = {
  Rack: "RACK",
  HierarchyLevel: "HIERARCHY_LEVEL",
  RowLayoutRack: "ROW_LAYOUT_RACK",
} as const;

export type DropType = (typeof DropType)[keyof typeof DropType];
