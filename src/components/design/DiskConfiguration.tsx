
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
    updateSelectedDisksForRole,
  } = useDesignStore();
  
  // Get available disks
  const availableDisks = componentTemplates.filter(c => c.type === ComponentType.Disk);
  
  // Get currently selected disks for this role
  const selectedDisks = selectedDisksByRole[roleId] || [];
  
  // Add a new disk to the configuration
  const handleAddDisk = () => {
    if (availableDisks.length === 0) return;
    
    const newSelectedDisks = [
      ...selectedDisks,
      { diskId: availableDisks[0].id, quantity: 1 }
    ];
    
    updateSelectedDisksForRole(roleId, newSelectedDisks);
  };
  
  // Remove a disk from the configuration
  const handleRemoveDisk = (index: number) => {
    const newSelectedDisks = [...selectedDisks];
    newSelectedDisks.splice(index, 1);
    updateSelectedDisksForRole(roleId, newSelectedDisks);
  };
  
  // Update disk selection
  const handleDiskChange = (index: number, diskId: string) => {
    const newSelectedDisks = [...selectedDisks];
    newSelectedDisks[index] = { 
      ...newSelectedDisks[index],
      diskId
    };
    updateSelectedDisksForRole(roleId, newSelectedDisks);
  };
  
  // Update disk quantity
  const handleQuantityChange = (index: number, quantity: number) => {
    if (isNaN(quantity) || quantity < 1) quantity = 1;
    
    const newSelectedDisks = [...selectedDisks];
    newSelectedDisks[index] = { 
      ...newSelectedDisks[index],
      quantity
    };
    updateSelectedDisksForRole(roleId, newSelectedDisks);
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
