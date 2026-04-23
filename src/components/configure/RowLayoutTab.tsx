import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDesignStore } from '@/store/designStore';
import { RowLayoutConfiguration, RackPhysicalProperties } from '@/types/infrastructure/rack-types';
import { toast } from 'sonner';

interface RackItemProps {
  rackId: string;
  rackName: string;
  index: number;
  properties: RackPhysicalProperties;
  onUpdateProperties: (rackId: string, updates: Partial<RackPhysicalProperties>) => void;
}

const RackItem: React.FC<RackItemProps> = ({
  rackId,
  rackName: _rackName,
  index,
  properties,
  onUpdateProperties,
}) => {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: rackId,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`bg-white border rounded-lg p-4 shadow-xs transition-opacity ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } cursor-move`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm text-muted-foreground">
            Rack {index + 1}
          </span>
          <span className="text-xs text-muted-foreground">ID: {rackId}</span>
        </div>
        
        <div className="space-y-2">
          <div>
            <Label htmlFor={`name-${rackId}`} className="text-xs">Friendly Name</Label>
            <Input
              id={`name-${rackId}`}
              value={properties.friendlyName}
              onChange={(e) => onUpdateProperties(rackId, { friendlyName: e.target.value })}
              className="h-8 text-sm"
              placeholder="Enter rack name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor={`width-${rackId}`} className="text-xs">Width (mm)</Label>
              <Input
                id={`width-${rackId}`}
                type="number"
                value={properties.widthMm}
                onChange={(e) => onUpdateProperties(rackId, { widthMm: parseInt(e.target.value) || 600 })}
                className="h-8 text-sm"
                min="400"
                max="1000"
              />
            </div>
            
            <div>
              <Label htmlFor={`gap-${rackId}`} className="text-xs">Gap After (mm)</Label>
              <Input
                id={`gap-${rackId}`}
                type="number"
                value={properties.gapAfterMm}
                onChange={(e) => onUpdateProperties(rackId, { gapAfterMm: parseInt(e.target.value) || 0 })}
                className="h-8 text-sm"
                min="0"
                max="2000"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TopDownViewProps {
  rowLayout: RowLayoutConfiguration;
}

const TopDownView: React.FC<TopDownViewProps> = ({ rowLayout }) => {
  const totalWidth = useMemo(() => {
    return rowLayout.rackOrder.reduce((total, rackId) => {
      const props = rowLayout.rackProperties[rackId];
      return total + (props?.widthMm || 600) + (props?.gapAfterMm || 0);
    }, 0);
  }, [rowLayout.rackOrder, rowLayout.rackProperties]);

  const scale = useMemo(() => {
    const maxWidth = 800; // Max width for the visualization
    return totalWidth > maxWidth ? maxWidth / totalWidth : 1;
  }, [totalWidth]);

  let currentX = 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top-Down View</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 border rounded-lg p-4 overflow-x-auto">
          <div className="relative" style={{ minHeight: '200px', width: `${totalWidth * scale}px` }}>
            {/* Cable height indicator */}
            <div
              className="absolute top-0 left-0 right-0 border-b-2 border-dashed border-blue-400"
              style={{ height: `${Math.min(rowLayout.cableHeightMm * scale * 0.1, 50)}px` }}
            >
              <span className="text-xs text-blue-600 absolute right-0 -top-4">
                Cable Height: {rowLayout.cableHeightMm}mm
              </span>
            </div>
            
            {/* Racks */}
            {rowLayout.rackOrder.map((rackId, _index) => {
              const props = rowLayout.rackProperties[rackId];
              if (!props) return null;
              
              const rackWidth = props.widthMm * scale;
              const rackX = currentX;
              
              currentX += props.widthMm + props.gapAfterMm;
              
              return (
                <div key={rackId}>
                  {/* Rack rectangle */}
                  <div
                    className="absolute bg-blue-100 border-2 border-blue-300 rounded flex items-center justify-center text-xs font-medium"
                    style={{
                      left: `${rackX * scale}px`,
                      top: `${Math.min(rowLayout.cableHeightMm * scale * 0.1, 50) + 10}px`,
                      width: `${rackWidth}px`,
                      height: '120px'
                    }}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{props.friendlyName}</div>
                      <div className="text-xs text-muted-foreground">{props.widthMm}mm</div>
                    </div>
                  </div>
                  
                  {/* Gap indicator */}
                  {props.gapAfterMm > 0 && (
                    <div
                      className="absolute border-l border-r border-dashed border-gray-400 bg-gray-200/50"
                      style={{
                        left: `${(rackX + props.widthMm) * scale}px`,
                        top: `${Math.min(rowLayout.cableHeightMm * scale * 0.1, 50) + 10}px`,
                        width: `${props.gapAfterMm * scale}px`,
                        height: '120px'
                      }}
                    >
                      <span
                        className="absolute text-xs text-gray-600 transform -rotate-90"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%) rotate(-90deg)'
                        }}
                      >
                        {props.gapAfterMm}mm
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 text-xs text-muted-foreground">
            Total width: {totalWidth}mm ({(totalWidth / 1000).toFixed(2)}m)
            {scale < 1 && ` • Scaled to ${(scale * 100).toFixed(0)}% for display`}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const RowLayoutTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const updateDesign = useDesignStore(state => state.updateDesign);
  
  const [cableHeight, setCableHeight] = useState(2000);
  
  // Get rack profiles from the design
  const rackProfiles = useMemo(() => {
    return activeDesign?.rackprofiles || [];
  }, [activeDesign?.rackprofiles]);

  // Initialize row layout from design or create default
  const [rowLayout, setRowLayout] = useState<RowLayoutConfiguration>(() => {
    if (activeDesign?.rowLayout) {
      return activeDesign.rowLayout;
    }
    
    // Create default row layout
    const rackOrder = rackProfiles.map((rack) => rack.id);
    const rackProperties: Record<string, RackPhysicalProperties> = {};
    
    rackProfiles.forEach((rack) => {
      rackProperties[rack.id] = {
        id: rack.id,
        friendlyName: rack.name || `Rack ${rack.id}`,
        widthMm: 600, // Standard rack width
        gapAfterMm: 100 // Default gap
      };
    });
    
    return {
      id: 'default',
      name: 'Default Row Layout',
      cableHeightMm: 2000,
      rackOrder,
      rackProperties,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  // Update cable height in row layout
  useEffect(() => {
    setCableHeight(rowLayout.cableHeightMm);
  }, [rowLayout.cableHeightMm]);

  // Update row layout when rack profiles change
  useEffect(() => {
    if (!rackProfiles.length) return;
    
    const currentRackIds = new Set(rackProfiles.map((rack) => rack.id));
    const layoutRackIds = new Set(rowLayout.rackOrder);
    
    // Check if rack profiles have changed
    const racksAdded = rackProfiles.some((rack) => !layoutRackIds.has(rack.id));
    const racksRemoved = rowLayout.rackOrder.some(id => !currentRackIds.has(id));
    
    if (racksAdded || racksRemoved) {
      // Update row layout to match current rack profiles
      const newRackOrder = rackProfiles.map((rack) => rack.id);
      const newRackProperties = { ...rowLayout.rackProperties };
      
      // Add new racks
      rackProfiles.forEach((rack) => {
        if (!newRackProperties[rack.id]) {
          newRackProperties[rack.id] = {
            id: rack.id,
            friendlyName: rack.name || `Rack ${rack.id}`,
            widthMm: 600,
            gapAfterMm: 100
          };
        }
      });
      
      // Remove deleted racks
      Object.keys(newRackProperties).forEach(rackId => {
        if (!currentRackIds.has(rackId)) {
          delete newRackProperties[rackId];
        }
      });
      
      setRowLayout(prev => ({
        ...prev,
        rackOrder: newRackOrder,
        rackProperties: newRackProperties,
        updatedAt: new Date()
      }));
    }
  }, [rackProfiles, rowLayout.rackOrder, rowLayout.rackProperties]);

  const handleUpdateProperties = (rackId: string, updates: Partial<RackPhysicalProperties>) => {
    setRowLayout(prev => ({
      ...prev,
      rackProperties: {
        ...prev.rackProperties,
        [rackId]: {
          ...prev.rackProperties[rackId],
          ...updates
        }
      },
      updatedAt: new Date()
    }));
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setRowLayout(prev => {
      const oldIndex = prev.rackOrder.indexOf(active.id as string);
      const newIndex = prev.rackOrder.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return {
        ...prev,
        rackOrder: arrayMove(prev.rackOrder, oldIndex, newIndex),
        updatedAt: new Date(),
      };
    });
  };

  const handleCableHeightChange = (value: number) => {
    setCableHeight(value);
    setRowLayout(prev => ({
      ...prev,
      cableHeightMm: value,
      updatedAt: new Date()
    }));
  };

  const handleSaveLayout = async () => {
    if (!activeDesign) return;
    
    try {
      updateDesign(activeDesign.id, { rowLayout });
      toast.success('Row layout saved successfully');
    } catch (error) {
      console.error('Failed to save row layout:', error);
      toast.error('Failed to save row layout');
    }
  };

  const handleResetLayout = () => {
    const rackOrder = rackProfiles.map((rack) => rack.id);
    const rackProperties: Record<string, RackPhysicalProperties> = {};
    
    rackProfiles.forEach((rack) => {
      rackProperties[rack.id] = {
        id: rack.id,
        friendlyName: rack.name || `Rack ${rack.id}`,
        widthMm: 600,
        gapAfterMm: 100
      };
    });
    
    const resetLayout: RowLayoutConfiguration = {
      id: 'default',
      name: 'Default Row Layout',
      cableHeightMm: 2000,
      rackOrder,
      rackProperties,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setRowLayout(resetLayout);
    setCableHeight(2000);
    toast.success('Row layout reset to defaults');
  };

  if (!rackProfiles.length) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Row Layout</h2>
          <p className="text-sm text-muted-foreground">
            Define the physical position and properties of racks in a row layout
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>No racks available in the current design.</p>
              <p className="text-sm mt-2">
                Please configure your requirements and generate rack layouts first.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold">Row Layout</h2>
          <p className="text-sm text-muted-foreground">
            Define the physical position and properties of racks in a row layout
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleSaveLayout}>Save Layout</Button>
          <Button variant="outline" onClick={handleResetLayout}>Reset to Defaults</Button>
        </div>

        {/* Cable Height Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cable Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label htmlFor="cable-height">Cable Height Above Racks (mm)</Label>
              <Input
                id="cable-height"
                type="number"
                value={cableHeight}
                onChange={(e) => handleCableHeightChange(parseInt(e.target.value) || 2000)}
                min="500"
                max="5000"
                step="100"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Vertical height above the racks before cables traverse horizontally
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Top-Down View */}
        <TopDownView rowLayout={rowLayout} />

        {/* Rack Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rack Configuration</CardTitle>
            <p className="text-sm text-muted-foreground">
              Drag and drop to reorder racks. Configure individual rack properties below.
            </p>
          </CardHeader>
          <CardContent>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext items={rowLayout.rackOrder} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rowLayout.rackOrder.map((rackId, index) => {
                    const rackProfile = rackProfiles.find((rack) => rack.id === rackId);
                    const properties = rowLayout.rackProperties[rackId];

                    if (!rackProfile || !properties) return null;

                    return (
                      <RackItem
                        key={rackId}
                        rackId={rackId}
                        rackName={rackProfile.name || `Rack ${rackId}`}
                        index={index}
                        properties={properties}
                        onUpdateProperties={handleUpdateProperties}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
    </div>
  );
};

export default RowLayoutTab;