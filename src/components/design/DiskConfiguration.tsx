
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

interface DiskConfigurationProps {
  roleId: string;
}

export const DiskConfiguration: React.FC<DiskConfigurationProps> = ({ roleId }) => {
  const { 
    componentTemplates, 
    selectedDisksByRole,
    addDiskToStorageNode,
    removeDiskFromStorageNode,
  } = useDesignStore();
  
  // Get available disks
  const availableDisks = componentTemplates.filter(c => c.type === ComponentType.Disk);
  
  // Get currently selected disks for this role
  const selectedDisks = selectedDisksByRole[roleId] || [];
  
  // Add a new disk to the configuration
  const handleAddDisk = () => {
    if (availableDisks.length === 0) return;
    
    // Use addDiskToStorageNode instead of updateSelectedDisksForRole
    addDiskToStorageNode(roleId, availableDisks[0].id, 1);
  };
  
  // Remove a disk from the configuration
  const handleRemoveDisk = (index: number) => {
    const diskConfig = selectedDisks[index];
    if (diskConfig) {
      // Use removeDiskFromStorageNode instead
      removeDiskFromStorageNode(roleId, diskConfig.diskId);
    }
  };
  
  // Update disk selection
  const handleDiskChange = (index: number, diskId: string) => {
    const newSelectedDisks = [...selectedDisks];
    const quantity = newSelectedDisks[index]?.quantity || 1;
    
    // Remove the old disk and add the new one
    if (newSelectedDisks[index]) {
      removeDiskFromStorageNode(roleId, newSelectedDisks[index].diskId);
    }
    addDiskToStorageNode(roleId, diskId, quantity);
  };
  
  // Update disk quantity
  const handleQuantityChange = (index: number, quantity: number) => {
    if (isNaN(quantity) || quantity < 1) quantity = 1;
    
    const diskConfig = selectedDisks[index];
    if (diskConfig) {
      addDiskToStorageNode(roleId, diskConfig.diskId, quantity);
    }
  };
  
  return (
    <Card className="mt-4">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium">Storage Configuration</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <div className="space-y-3">
          {selectedDisks.map((diskConfig, index) => {
            const selectedDisk = componentTemplates.find(d => d.id === diskConfig.diskId);
            
            return (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-7">
                  <Label className="text-xs mb-1">Disk Type</Label>
                  <Select
                    value={diskConfig.diskId}
                    onValueChange={(value) => handleDiskChange(index, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select disk type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDisks.map((disk) => (
                        <SelectItem key={disk.id} value={disk.id}>
                          {disk.name} ({disk.description})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-3">
                  <Label className="text-xs mb-1">Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={diskConfig.quantity}
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value))}
                  />
                </div>
                
                <div className="col-span-2 self-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => handleRemoveDisk(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {selectedDisk && (
                  <div className="col-span-12 bg-muted p-2 text-xs rounded">
                    {selectedDisk.manufacturer} {selectedDisk.model} - 
                    {(selectedDisk as any).capacityTB} TB ({(selectedDisk as any).diskType || 'Unknown'}) - 
                    ${selectedDisk.cost}/disk
                  </div>
                )}
              </div>
            );
          })}
          
          {selectedDisks.length > 0 && <Separator className="my-2" />}
          
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleAddDisk}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Disk
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
