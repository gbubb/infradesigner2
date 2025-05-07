
import React, { useState, useRef, useEffect } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfrastructureComponent } from '@/types/infrastructure/component-types';

interface RackMountedDevice {
  id: string;
  name: string;
  ruSize: number;
  startingRU: number;
  component: InfrastructureComponent;
  color?: string;
}

interface RackDefinition {
  id: string;
  name: string;
  totalRU: number;
  devices: RackMountedDevice[];
}

export const RackLayoutsTab: React.FC = () => {
  const activeDesign = useDesignStore(state => state.activeDesign);
  const [racks, setRacks] = useState<RackDefinition[]>([]);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [draggedDevice, setDraggedDevice] = useState<{deviceId: string, offsetY: number} | null>(null);
  const rackRef = useRef<HTMLDivElement>(null);
  
  // Initialize racks based on design requirements
  useEffect(() => {
    if (!activeDesign) return;
    
    const physicalConstraints = activeDesign.requirements.physicalConstraints;
    const rackQuantity = physicalConstraints?.computeStorageRackQuantity || 1;
    const ruPerRack = physicalConstraints?.rackUnitsPerRack || 42;
    
    // Create initial racks
    const newRacks: RackDefinition[] = [];
    for (let i = 0; i < rackQuantity; i++) {
      newRacks.push({
        id: `rack-${i + 1}`,
        name: `Rack ${i + 1}`,
        totalRU: ruPerRack,
        devices: []
      });
    }
    
    // Get components that can be mounted in racks
    const rackMountableComponents = (activeDesign.components || []).filter(component => {
      // Filter components with defined RU sizes
      return (
        component.type === 'Server' || 
        component.type === 'Switch' || 
        component.type === 'Router' || 
        component.type === 'Firewall' ||
        component.ruSize // Any component with ruSize property
      );
    });
    
    // Get a color based on component type for visual distinction
    const getComponentColor = (component: InfrastructureComponent) => {
      switch (component.type) {
        case 'Server': 
          return component.role === 'storageNode' ? '#a3cfbb' : '#c7ddf4';
        case 'Switch': return '#f8d3d0';
        case 'Router': return '#f5e8b8';
        case 'Firewall': return '#e6c9e1';
        default: return '#e2e2e2';
      }
    };
    
    // Initial placement logic - distribute components across racks
    let currentRackIndex = 0;
    let currentRUPosition = 1; // Start from the bottom
    
    rackMountableComponents.forEach(component => {
      const ruSize = component.ruSize || 1; // Default 1U if not specified
      const quantity = component.quantity || 1;
      
      // Place each instance of this component
      for (let i = 0; i < quantity; i++) {
        // If current rack doesn't have enough space, move to next rack
        if (currentRUPosition + ruSize > ruPerRack + 1) {
          currentRackIndex = (currentRackIndex + 1) % rackQuantity;
          currentRUPosition = 1;
        }
        
        // Place the component
        if (newRacks[currentRackIndex]) {
          newRacks[currentRackIndex].devices.push({
            id: `${component.id}-${i}`,
            name: component.name,
            ruSize,
            startingRU: currentRUPosition,
            component,
            color: getComponentColor(component)
          });
          
          currentRUPosition += ruSize;
        }
      }
    });
    
    setRacks(newRacks);
    if (newRacks.length > 0) {
      setSelectedRackId(newRacks[0].id);
    }
  }, [activeDesign]);
  
  const selectedRack = racks.find(r => r.id === selectedRackId);
  
  // Handle RU position change via input
  const handlePositionChange = (deviceId: string, position: number) => {
    if (!selectedRack) return;
    
    setRacks(prevRacks => {
      return prevRacks.map(rack => {
        if (rack.id === selectedRackId) {
          const updatedDevices = rack.devices.map(device => {
            if (device.id === deviceId) {
              // Ensure position is within valid range
              const validPosition = Math.max(1, Math.min(rack.totalRU - device.ruSize + 1, position));
              return { ...device, startingRU: validPosition };
            }
            return device;
          });
          
          return { ...rack, devices: updatedDevices };
        }
        return rack;
      });
    });
  };
  
  // Drag and drop handlers
  const handleDragStart = (e: React.MouseEvent, deviceId: string) => {
    const device = selectedRack?.devices.find(d => d.id === deviceId);
    if (!device || !rackRef.current) return;
    
    // Calculate offset from top of device
    const rackRect = rackRef.current.getBoundingClientRect();
    const offsetY = e.clientY - rackRect.top;
    
    setDraggedDevice({ deviceId, offsetY });
  };
  
  const handleDrag = (e: React.MouseEvent) => {
    if (!draggedDevice || !rackRef.current || !selectedRack) return;
    
    const rackRect = rackRef.current.getBoundingClientRect();
    const ruHeight = rackRect.height / selectedRack.totalRU;
    const device = selectedRack.devices.find(d => d.id === draggedDevice.deviceId);
    
    if (!device) return;
    
    // Calculate new position based on mouse position and offset
    const relativeY = e.clientY - rackRect.top - draggedDevice.offsetY;
    const newRUPosition = Math.max(1, Math.min(
      selectedRack.totalRU - device.ruSize + 1,
      Math.floor(relativeY / ruHeight) + 1
    ));
    
    // Update position
    handlePositionChange(draggedDevice.deviceId, newRUPosition);
  };
  
  const handleDragEnd = () => {
    setDraggedDevice(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Rack Layouts</h2>
        <p className="text-sm text-muted-foreground">
          Visualize and organize components within racks
        </p>
      </div>
      
      <div className="flex gap-4">
        {racks.map(rack => (
          <Button
            key={rack.id}
            variant={selectedRackId === rack.id ? "default" : "outline"}
            onClick={() => setSelectedRackId(rack.id)}
          >
            {rack.name}
          </Button>
        ))}
      </div>
      
      {selectedRack && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="h-[800px] overflow-auto">
              <CardContent className="p-4">
                <div 
                  ref={rackRef}
                  className="relative bg-gray-100 border border-gray-300 rounded-lg h-full"
                  onMouseMove={draggedDevice ? handleDrag : undefined}
                  onMouseUp={draggedDevice ? handleDragEnd : undefined}
                  onMouseLeave={draggedDevice ? handleDragEnd : undefined}
                >
                  {/* RU markings */}
                  {Array.from({ length: selectedRack.totalRU }).map((_, index) => (
                    <div 
                      key={`ru-${index + 1}`} 
                      className="absolute left-0 w-6 border-t border-gray-300 text-xs flex items-center justify-center h-6"
                      style={{ 
                        bottom: `${(index / selectedRack.totalRU) * 100}%`,
                        height: `${(1 / selectedRack.totalRU) * 100}%`
                      }}
                    >
                      {index + 1}
                    </div>
                  ))}
                  
                  {/* Devices */}
                  {selectedRack.devices.map(device => (
                    <div
                      key={device.id}
                      className="absolute left-6 right-0 shadow-md rounded border border-gray-400 flex items-center justify-center text-sm font-medium cursor-move select-none overflow-hidden"
                      style={{ 
                        bottom: `${((device.startingRU - 1) / selectedRack.totalRU) * 100}%`,
                        height: `${(device.ruSize / selectedRack.totalRU) * 100}%`,
                        backgroundColor: device.color || '#e2e2e2'
                      }}
                      onMouseDown={(e) => handleDragStart(e, device.id)}
                    >
                      <div className="p-2 text-center leading-tight">
                        <div className="truncate">{device.name}</div>
                        <div className="text-xs opacity-70">{device.ruSize}U</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-4">Rack {selectedRack.name} Components</h3>
                <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                  {selectedRack.devices.map(device => (
                    <div key={device.id} className="border rounded-md p-3 space-y-2">
                      <div className="font-medium">{device.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {device.ruSize}U - {device.component.type} - {device.component.manufacturer}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <Label htmlFor={`position-${device.id}`} className="col-span-1">Position (RU)</Label>
                        <Input 
                          id={`position-${device.id}`}
                          type="number"
                          min={1}
                          max={selectedRack.totalRU - device.ruSize + 1}
                          value={device.startingRU}
                          onChange={(e) => handlePositionChange(device.id, parseInt(e.target.value))}
                          className="col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
