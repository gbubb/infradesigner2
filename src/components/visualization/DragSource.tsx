import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { InfrastructureComponent } from "@/types/infrastructure";
import { DragType } from "./dnd/dragTypes";

interface DragSourceProps {
  component: InfrastructureComponent;
  children: React.ReactNode;
}

export const DragSource: React.FC<DragSourceProps> = ({ component, children }) => {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: `palette-${component.id}`,
    data: {
      type: DragType.PaletteComponent,
      component,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: "move",
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
    >
      {children}
    </div>
  );
};
