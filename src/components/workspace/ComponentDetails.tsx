
import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Copy, Edit, Save, X } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';

interface ComponentDetailsProps {
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

export const ComponentDetails: React.FC<ComponentDetailsProps> = ({ open, onClose, onDelete }) => {
  const { 
    selectedComponentId, 
    placedComponents, 
    removeComponent, 
    duplicateComponent, 
    startEditingComponent, 
    editingComponentId,
    cancelEditingComponent,
    updateComponent
  } = useDesignStore();
  
  const component = selectedComponentId ? placedComponents[selectedComponentId] : null;
  const isEditing = editingComponentId === selectedComponentId;
  
  const [editForm, setEditForm] = useState<Partial<InfrastructureComponent>>({});
  
  if (!component) {
    return null;
  }

  const handleDelete = () => {
    if (selectedComponentId) {
      removeComponent(selectedComponentId);
      onClose();
    }
  };

  const handleDuplicate = () => {
    if (selectedComponentId) {
      duplicateComponent(selectedComponentId);
      onClose();
    }
  };

  const handleEdit = () => {
    if (selectedComponentId) {
      // Initialize edit form with current values
      setEditForm({
        name: component.name,
        manufacturer: component.manufacturer,
        model: component.model,
        cost: component.cost,
        powerRequired: component.powerRequired,
      });
      startEditingComponent(selectedComponentId);
    }
  };

  const handleSave = () => {
    if (selectedComponentId && Object.keys(editForm).length > 0) {
      updateComponent(selectedComponentId, editForm);
    }
  };

  const handleCancel = () => {
    cancelEditingComponent();
    setEditForm({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let parsedValue: string | number = value;
    
    // Convert number fields from string to number
    if (name === 'cost' || name === 'powerRequired') {
      parsedValue = parseFloat(value) || 0;
    }
    
    setEditForm({
      ...editForm,
      [name]: parsedValue
    });
  };

  // Render specific component properties based on type
  const renderComponentSpecificDetails = () => {
    if (isEditing) return null;
    
    switch (component.type) {
      case ComponentType.Server:
        // Check if component has server properties
        if ('cpuModel' in component && 'coreCount' in component && 'memoryGB' in component) {
          return (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">CPU Model</div>
                <div>{component.cpuModel}</div>
                
                <div className="text-gray-500">CPU Count</div>
                <div>{component.cpuCount}</div>
                
                <div className="text-gray-500">Cores</div>
                <div>{component.coreCount}</div>
                
                <div className="text-gray-500">Memory</div>
                <div>{component.memoryGB} GB</div>
                
                {component.storageCapacityTB && (
                  <>
                    <div className="text-gray-500">Storage</div>
                    <div>{component.storageCapacityTB} TB</div>
                  </>
                )}
                
                {component.networkPorts && component.networkPortSpeed && (
                  <>
                    <div className="text-gray-500">Network</div>
                    <div>{component.networkPorts} ports @ {component.networkPortSpeed} Gbps</div>
                  </>
                )}
                
                <div className="text-gray-500">Rack Units</div>
                <div>{component.rackUnitsConsumed} RU</div>
              </div>
            </>
          );
        }
        break;
      
      case ComponentType.Switch:
      case ComponentType.Router:
        // Check if component has network device properties
        if ('portCount' in component && 'portSpeed' in component && 'rackUnitsConsumed' in component) {
          return (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Ports</div>
                <div>{component.portCount}</div>
                
                <div className="text-gray-500">Port Speed</div>
                <div>{component.portSpeed} Gbps</div>
                
                <div className="text-gray-500">Rack Units</div>
                <div>{component.rackUnitsConsumed} RU</div>

                {component.type === ComponentType.Router && 'throughput' in component && 'supportedProtocols' in component && (
                  <>
                    <div className="text-gray-500">Throughput</div>
                    <div>{component.throughput} Gbps</div>
                    
                    <div className="text-gray-500">Protocols</div>
                    <div>{component.supportedProtocols.join(', ')}</div>
                  </>
                )}
              </div>
            </>
          );
        }
        break;
      
      case ComponentType.Disk:
        // Check if component has disk properties
        if ('capacityTB' in component && 'formFactor' in component && 'interface' in component) {
          return (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Capacity</div>
                <div>{component.capacityTB} TB</div>
                
                <div className="text-gray-500">Form Factor</div>
                <div>{component.formFactor}</div>
                
                <div className="text-gray-500">Interface</div>
                <div>{component.interface}</div>
                
                {component.iops && (
                  <>
                    <div className="text-gray-500">IOPS</div>
                    <div>{component.iops.toLocaleString()}</div>
                  </>
                )}
                
                {component.readSpeed && (
                  <>
                    <div className="text-gray-500">Read Speed</div>
                    <div>{component.readSpeed} MB/s</div>
                  </>
                )}
                
                {component.writeSpeed && (
                  <>
                    <div className="text-gray-500">Write Speed</div>
                    <div>{component.writeSpeed} MB/s</div>
                  </>
                )}
              </div>
            </>
          );
        }
        break;
      
      default:
        return (
          <div className="text-sm text-gray-500">
            No specific details available for this component type.
          </div>
        );
    }
    
    return (
      <div className="text-sm text-gray-500">
        No specific details available for this component.
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Component" : component.name}</SheetTitle>
        </SheetHeader>
        
        <div className="py-4">
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={editForm.name || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  name="manufacturer"
                  value={editForm.manufacturer || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  name="model"
                  value={editForm.model || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    value={editForm.cost || 0}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="powerRequired">Power (W)</Label>
                  <Input
                    id="powerRequired"
                    name="powerRequired"
                    type="number"
                    value={editForm.powerRequired || 0}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Manufacturer</div>
                <div>{component.manufacturer}</div>
                
                <div className="text-gray-500">Model</div>
                <div>{component.model}</div>
                
                <div className="text-gray-500">Cost</div>
                <div>${component.cost}</div>
                
                <div className="text-gray-500">Power</div>
                <div>{component.powerRequired} W</div>
              </div>
              
              <Separator className="my-4" />
              
              {renderComponentSpecificDetails()}
            </>
          )}
        </div>
        
        <SheetFooter className="flex justify-between sm:justify-between">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
