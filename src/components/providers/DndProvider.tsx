import * as React from "react";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

interface DndProviderProps {
  children: React.ReactNode;
}

/**
 * Global drag-and-drop context. Each droppable attaches its own `onDrop` handler
 * via `useDroppable({ data: { onDrop } })`; this provider just routes the drag-end
 * event to whichever droppable the user released over.
 *
 * Feature areas that want independent DnD (HierarchyBuilder, RowLayoutTab) mount
 * their own nested `<DndContext>` — nested contexts capture drags started inside
 * their subtree and don't bubble to this global handler.
 */
export const DndProvider: React.FC<DndProviderProps> = ({ children }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const dropHandler = event.over?.data?.current?.onDrop as
      | ((event: DragEndEvent) => void)
      | undefined;
    dropHandler?.(event);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {children}
    </DndContext>
  );
};
