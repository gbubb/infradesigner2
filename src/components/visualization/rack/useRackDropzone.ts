import { useCallback } from "react";
import { useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { RackProfile } from "@/types/infrastructure/rack-types";
import { DragType, DropType } from "../dnd/dragTypes";
import { calculateDropRUPositionFromRect } from "./rackUtils";

interface UseRackDropzoneProps {
  rackProfileId: string;
  rackProfile: RackProfile | null;
  placeDevice: (deviceId: string, targetRuPosition?: number) => { success: boolean; error?: string };
  moveDevice: (deviceId: string, newRuPosition: number) => { success: boolean; error?: string };
}

/**
 * Hook wiring a rack view as a `@dnd-kit` droppable. The global `<DndProvider>`
 * invokes the `onDrop` we attach via `data`, so drop logic lives alongside the
 * rack state it needs to mutate.
 */
export const useRackDropzone = ({
  rackProfileId,
  rackProfile,
  placeDevice,
  moveDevice,
}: UseRackDropzoneProps) => {
  const onDrop = useCallback(
    (event: DragEndEvent) => {
      if (!rackProfile || !event.over || !event.active) return;

      const rackRect = event.over.rect;
      const activeRect = event.active.rect.current.translated;
      if (!rackRect || !activeRect) return;

      const ruPosition = calculateDropRUPositionFromRect({
        dropY: activeRect.top,
        rackTop: rackRect.top,
        rackHeight: rackRect.height,
        uHeight: rackProfile.uHeight,
      });

      const activeData = event.active.data.current;
      if (!activeData) return;

      if (activeData.type === DragType.PaletteComponent) {
        const component = activeData.component as { id: string } | undefined;
        if (!component) return;
        const result = placeDevice(component.id, ruPosition);
        if (result.success) toast.success(`Device placed at RU ${ruPosition}`);
        else toast.error(result.error || "Failed to place device");
      } else if (activeData.type === DragType.PlacedDevice) {
        const item = activeData as { deviceId: string; currentPosition: number };
        const result = moveDevice(item.deviceId, ruPosition);
        if (result.success) toast.success(`Device moved to RU ${ruPosition}`);
        else toast.error(result.error || "Failed to move device");
      }
    },
    [rackProfile, placeDevice, moveDevice]
  );

  const { setNodeRef, isOver, active } = useDroppable({
    id: `rack-${rackProfileId}`,
    data: {
      type: DropType.Rack,
      rackProfileId,
      onDrop,
    },
  });

  const canDrop =
    isOver &&
    active?.data?.current?.type !== undefined &&
    (active.data.current.type === DragType.PaletteComponent ||
      active.data.current.type === DragType.PlacedDevice);

  return { setNodeRef, isOver, canDrop };
};
