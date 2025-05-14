
import { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { calculateDropRUPosition } from './rackUtils';
import { toast } from 'sonner';

interface UseRackDropzoneProps {
  rackProfileId: string;
  rackProfile: any;
  placeDevice: (deviceId: string, targetRuPosition?: number) => { success: boolean; error?: string };
  moveDevice: (deviceId: string, newRuPosition: number) => { success: boolean; error?: string };
}

export const useRackDropzone = ({
  rackProfileId,
  rackProfile,
  placeDevice,
  moveDevice,
}: UseRackDropzoneProps) => {
  const calculateDropRUPositionCallback = useCallback((clientOffset: { y: number }) => {
    if (!rackProfile) return 1;
    return calculateDropRUPosition(clientOffset, rackProfileId, rackProfile.uHeight);
  }, [rackProfileId, rackProfile]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ['RACK_DEVICE', 'RACK_PLACED_DEVICE'],
    drop: (item: { id: string; ruSize: number; currentPosition?: number }, monitor) => {
      // Get drop position from client offset
      const clientOffset = monitor.getClientOffset();
      
      if (!clientOffset) return;
      
      const ruPosition = calculateDropRUPositionCallback(clientOffset);
      
      // If it's a device already in the rack being moved
      if (monitor.getItemType() === 'RACK_PLACED_DEVICE' && item.currentPosition !== undefined) {
        const result = moveDevice(item.id, ruPosition);
        if (result.success) {
          toast.success(`Device moved to RU ${ruPosition}`);
        } else {
          toast.error(result.error || 'Failed to move device');
        }
      } 
      // If it's a new device being added from the palette
      else if (monitor.getItemType() === 'RACK_DEVICE') {
        const result = placeDevice(item.id, ruPosition);
        if (result.success) {
          toast.success(`Device placed at RU ${ruPosition}`);
        } else {
          toast.error(result.error || 'Failed to place device');
        }
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [rackProfileId, placeDevice, moveDevice, calculateDropRUPositionCallback]);

  return { isOver, canDrop, drop };
};
