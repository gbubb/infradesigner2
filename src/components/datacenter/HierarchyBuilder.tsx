import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Edit2, Trash2, Building, Home, Server, Grid3x3, Box, AlertCircle } from 'lucide-react';
import { DatacenterFacility, HierarchyLevel } from '@/types/infrastructure/datacenter-types';
import { cn } from '@/lib/utils';
import { useDrag, useDrop } from 'react-dnd';

interface HierarchyBuilderProps {
  facility: DatacenterFacility;
  onUpdate: (facility: DatacenterFacility) => void;
}

interface HierarchyNodeProps {
  level: HierarchyLevel;
  allLevels: HierarchyLevel[];
  onEdit: (level: HierarchyLevel) => void;
  onDelete: (levelId: string) => void;
  onMove: (draggedId: string, targetId: string | null) => void;
  depth?: number;
}

const hierarchyIcons = {
  'Building': Building,
  'Floor': Home,
  'Hall': Grid3x3,
  'Pod': Server,
  'Row': Box,
  'Rack': Server
};

const HierarchyNode: React.FC<HierarchyNodeProps> = ({ 
  level, 
  allLevels, 
  onEdit, 
  onDelete, 
  onMove,
  depth = 0 
}) => {
  const children = allLevels.filter(l => l.parentId === level.id);
  const Icon = hierarchyIcons[level.name as keyof typeof hierarchyIcons] || Box;

  const [{ isDragging }, drag] = useDrag({
    type: 'HIERARCHY_LEVEL',
    item: { id: level.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'HIERARCHY_LEVEL',
    drop: (item: { id: string }) => {
      if (item.id !== level.id) {
        onMove(item.id, level.id);
      }
    },
    canDrop: (item: { id: string }) => {
      // Prevent dropping a parent onto its own child
      const isDescendant = (parentId: string, childId: string): boolean => {
        const child = allLevels.find(l => l.id === childId);
        if (!child) return false;
        if (child.parentId === parentId) return true;
        if (child.parentId) return isDescendant(parentId, child.parentId);
        return false;
      };
      return item.id !== level.id && !isDescendant(item.id, level.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const dragDropRef = (el: HTMLDivElement | null) => {
    drag(el);
    drop(el);
  };

  return (
    <div className="relative">
      <div
        ref={dragDropRef}
        className={cn(
          "flex items-center gap-2 p-3 rounded-md border bg-card transition-all cursor-move",
          isDragging && "opacity-50",
          isOver && canDrop && "border-primary bg-primary/5",
          isOver && !canDrop && "border-destructive bg-destructive/5"
        )}
        style={{ marginLeft: `${depth * 24}px` }}
      >
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium flex-1">{level.name}</span>
        {level.capacity && (
          <div className="flex gap-2">
            {level.capacity.racks && (
              <Badge variant="secondary" className="text-xs">
                {level.capacity.racks} racks
              </Badge>
            )}
            {level.capacity.powerKW && (
              <Badge variant="outline" className="text-xs">
                {level.capacity.powerKW} kW
              </Badge>
            )}
          </div>
        )}
        {level.customAttributes && Object.keys(level.customAttributes).length > 0 && (
          <Badge variant="outline" className="text-xs">
            {Object.keys(level.customAttributes).length} attrs
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(level);
          }}
        >
          <Edit2 className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(level.id);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      {children.length > 0 && (
        <div className="mt-2">
          {children.map(child => (
            <HierarchyNode
              key={child.id}
              level={child}
              allLevels={allLevels}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const HierarchyBuilder: React.FC<HierarchyBuilderProps> = ({ facility, onUpdate }) => {
  const [editingLevel, setEditingLevel] = useState<HierarchyLevel | null>(null);
  const [isAddingLevel, setIsAddingLevel] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelParentId, setNewLevelParentId] = useState<string | undefined>(undefined);
  const [customAttributes, setCustomAttributes] = useState<Record<string, string>>({});
  const [newLevelRackCapacity, setNewLevelRackCapacity] = useState<number | undefined>(undefined);
  const [newLevelPowerCapacity, setNewLevelPowerCapacity] = useState<number | undefined>(undefined);

  const rootLevels = facility.hierarchyConfig.filter(l => !l.parentId);

  const handleAddLevel = () => {
    if (!newLevelName.trim()) return;

    // Calculate the level based on parent
    let level = 0;
    if (newLevelParentId) {
      const parent = facility.hierarchyConfig.find(l => l.id === newLevelParentId);
      if (parent) {
        level = (parent.level || 0) + 1;
      }
    }

    const newLevel: HierarchyLevel = {
      id: crypto.randomUUID(),
      name: newLevelName.trim(),
      parentId: newLevelParentId,
      level: level,
      customAttributes: Object.keys(customAttributes).length > 0 ? customAttributes : undefined,
      capacity: (newLevelRackCapacity || newLevelPowerCapacity) ? {
        racks: newLevelRackCapacity,
        powerKW: newLevelPowerCapacity
      } : undefined
    };

    onUpdate({
      ...facility,
      hierarchyConfig: [...facility.hierarchyConfig, newLevel]
    });

    setNewLevelName('');
    setNewLevelParentId(undefined);
    setCustomAttributes({});
    setNewLevelRackCapacity(undefined);
    setNewLevelPowerCapacity(undefined);
    setIsAddingLevel(false);
  };

  const handleEditLevel = (level: HierarchyLevel) => {
    const updatedLevels = facility.hierarchyConfig.map(l => 
      l.id === level.id ? level : l
    );
    onUpdate({
      ...facility,
      hierarchyConfig: updatedLevels
    });
    setEditingLevel(null);
  };

  const handleDeleteLevel = (levelId: string) => {
    // Delete the level and all its children
    const deleteRecursive = (id: string): string[] => {
      const children = facility.hierarchyConfig.filter(l => l.parentId === id);
      const childIds = children.flatMap(child => deleteRecursive(child.id));
      return [id, ...childIds];
    };

    const idsToDelete = deleteRecursive(levelId);
    const updatedLevels = facility.hierarchyConfig.filter(l => !idsToDelete.includes(l.id));
    
    onUpdate({
      ...facility,
      hierarchyConfig: updatedLevels
    });
  };

  const handleMoveLevel = (draggedId: string, targetId: string | null) => {
    // First update the parent relationship
    let updatedLevels = facility.hierarchyConfig.map(level => {
      if (level.id === draggedId) {
        return { ...level, parentId: targetId };
      }
      return level;
    });
    
    // Then recalculate all levels based on the new hierarchy
    const calculateLevels = (levels: HierarchyLevel[]): HierarchyLevel[] => {
      const levelMap = new Map<string, HierarchyLevel>();
      levels.forEach(l => levelMap.set(l.id, { ...l }));
      
      const calculateLevel = (id: string): number => {
        const level = levelMap.get(id);
        if (!level) return 0;
        if (!level.parentId) return 0;
        return calculateLevel(level.parentId) + 1;
      };
      
      return levels.map(l => ({
        ...l,
        level: calculateLevel(l.id)
      }));
    };
    
    updatedLevels = calculateLevels(updatedLevels as HierarchyLevel[]);

    onUpdate({
      ...facility,
      hierarchyConfig: updatedLevels as HierarchyLevel[]
    });
  };

  // Add default hierarchy template
  const addDefaultHierarchy = () => {
    const buildingId = crypto.randomUUID();
    const floorId = crypto.randomUUID();
    const hallId = crypto.randomUUID();
    const podId = crypto.randomUUID();
    const rowId = crypto.randomUUID();
    
    const defaultHierarchy: HierarchyLevel[] = [
      { id: buildingId, name: 'Building', parentId: undefined, level: 0 },
      { id: floorId, name: 'Floor', parentId: buildingId, level: 1 },
      { id: hallId, name: 'Hall', parentId: floorId, level: 2 },
      { id: podId, name: 'Pod', parentId: hallId, level: 3 },
      { id: rowId, name: 'Row', parentId: podId, level: 4, capacity: { racks: 10, powerKW: 100 } },
    ];
    
    onUpdate({
      ...facility,
      hierarchyConfig: defaultHierarchy
    });
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Space Hierarchy</CardTitle>
          <div className="flex gap-2">
            {facility.hierarchyConfig.length === 0 && (
              <Button variant="outline" size="sm" onClick={addDefaultHierarchy}>
                Use Default Template
              </Button>
            )}
            <Button size="sm" onClick={() => setIsAddingLevel(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Level
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {facility.hierarchyConfig.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No hierarchy levels defined. Add levels to organize your datacenter space.
            </p>
            <p className="text-sm text-muted-foreground">
              Typical hierarchy: Building → Floor → Hall → Pod → Row → Rack
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[600px] pr-4">
              <div className="space-y-2">
                {rootLevels.map(level => (
                  <HierarchyNode
                    key={level.id}
                    level={level}
                    allLevels={facility.hierarchyConfig}
                    onEdit={setEditingLevel}
                    onDelete={handleDeleteLevel}
                    onMove={handleMoveLevel}
                  />
                ))}
              </div>
          </ScrollArea>
        )}

        {/* Add Level Dialog */}
        <Dialog open={isAddingLevel} onOpenChange={setIsAddingLevel}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Hierarchy Level</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="level-name">Level Name</Label>
                <Input
                  id="level-name"
                  value={newLevelName}
                  onChange={(e) => setNewLevelName(e.target.value)}
                  placeholder="e.g., Building, Floor, Hall"
                />
              </div>
              <div>
                <Label htmlFor="parent-level">Parent Level (Optional)</Label>
                <select
                  id="parent-level"
                  className="w-full p-2 border rounded-md"
                  value={newLevelParentId || 'none'}
                  onChange={(e) => setNewLevelParentId(e.target.value === 'none' ? undefined : e.target.value)}
                >
                  <option value="none">None (Root Level)</option>
                  {facility.hierarchyConfig.map(level => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rack-capacity">Rack Capacity</Label>
                  <Input
                    id="rack-capacity"
                    type="number"
                    min="0"
                    value={newLevelRackCapacity || ''}
                    onChange={(e) => setNewLevelRackCapacity(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="e.g., 10"
                  />
                </div>
                <div>
                  <Label htmlFor="power-capacity">Power Capacity (kW)</Label>
                  <Input
                    id="power-capacity"
                    type="number"
                    min="0"
                    value={newLevelPowerCapacity || ''}
                    onChange={(e) => setNewLevelPowerCapacity(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="e.g., 100"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingLevel(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddLevel}>Add Level</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Level Dialog */}
        <Dialog open={!!editingLevel} onOpenChange={() => setEditingLevel(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Hierarchy Level</DialogTitle>
            </DialogHeader>
            {editingLevel && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-level-name">Level Name</Label>
                  <Input
                    id="edit-level-name"
                    value={editingLevel.name}
                    onChange={(e) => setEditingLevel({ ...editingLevel, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-parent-level">Parent Level</Label>
                  <select
                    id="edit-parent-level"
                    className="w-full p-2 border rounded-md"
                    value={editingLevel.parentId || 'none'}
                    onChange={(e) => setEditingLevel({ 
                      ...editingLevel, 
                      parentId: e.target.value === 'none' ? undefined : e.target.value 
                    })}
                  >
                    <option value="none">None (Root Level)</option>
                    {facility.hierarchyConfig
                      .filter(level => level.id !== editingLevel.id)
                      .map(level => (
                        <option key={level.id} value={level.id}>
                          {level.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-rack-capacity">Rack Capacity</Label>
                    <Input
                      id="edit-rack-capacity"
                      type="number"
                      min="0"
                      value={editingLevel.capacity?.racks || ''}
                      onChange={(e) => setEditingLevel({
                        ...editingLevel,
                        capacity: {
                          ...editingLevel.capacity,
                          racks: e.target.value ? parseInt(e.target.value) : undefined,
                          powerKW: editingLevel.capacity?.powerKW
                        }
                      })}
                      placeholder="e.g., 10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-power-capacity">Power Capacity (kW)</Label>
                    <Input
                      id="edit-power-capacity"
                      type="number"
                      min="0"
                      value={editingLevel.capacity?.powerKW || ''}
                      onChange={(e) => setEditingLevel({
                        ...editingLevel,
                        capacity: {
                          ...editingLevel.capacity,
                          racks: editingLevel.capacity?.racks,
                          powerKW: e.target.value ? parseFloat(e.target.value) : undefined
                        }
                      })}
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingLevel(null)}>
                Cancel
              </Button>
              <Button onClick={() => editingLevel && handleEditLevel(editingLevel)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};