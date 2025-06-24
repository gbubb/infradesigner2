
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';
import { DiskComponent, DiskConfig } from '@/types/design';

interface DiskConfigurationProps {
  roleId: string;
}

export const DiskConfiguration: React.FC<DiskConfigurationProps> = ({ roleId }) => {
  const { 
    componentTemplates, 
    selectedDisksByRole,
    addDiskToStorageNode,
    removeDiskFromStorageNode,
    componentRoles,
  } = useDesignStore();
  
  // Get available disks
  const availableDisks = componentTemplates.filter(
    (c): c is DiskComponent => c.type === ComponentType.Disk
  );
  
  // Get currently selected disks for this role
  const selectedDisks: DiskConfig[] = selectedDisksByRole[roleId] || [];
  

  // Local state for new disk form
  const [selectedDiskId, setSelectedDiskId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  
  // Add a new disk to the configuration
  const handleAddDisk = () => {
    if (selectedDiskId && quantity > 0) {
      console.log('[DiskConfiguration] Adding disk:', { roleId, selectedDiskId, quantity });
      addDiskToStorageNode(roleId, selectedDiskId, quantity);
      setSelectedDiskId('');
      setQuantity(1);
    }
  };
  
  // Remove a disk from the configuration
  const handleRemoveDisk = (diskId: string) => {
    removeDiskFromStorageNode(roleId, diskId);
  };

  // Find disk component by ID
  const findDiskById = (id: string) => {
    return availableDisks.find(disk => disk.id === id);
  };
  
  // Check if this is a hyper-converged node
  const role = componentRoles.find(r => r.id === roleId);
  const isHyperConverged = role?.role === 'hyperConvergedNode';
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">
          Storage Configuration
          {isHyperConverged && (
            <span className="text-xs font-normal text-muted-foreground ml-2">
              (Hyper-Converged)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-6">
              <label className="text-sm mb-1 block">Disk Model</label>
              <Select value={selectedDiskId} onValueChange={setSelectedDiskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select disk model" />
                </SelectTrigger>
                <SelectContent>
                  {availableDisks.map(disk => (
                    <SelectItem key={disk.id} value={disk.id}>
                      {disk.manufacturer} {disk.name} ({disk.capacityTB}TB)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-3">
              <label className="text-sm mb-1 block">Quantity</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="col-span-3">
              <Button 
                onClick={handleAddDisk} 
                disabled={!selectedDiskId || quantity < 1}
                className="w-full"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {selectedDisks.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Assigned Disks</h4>
              <div className="border rounded-md divide-y">
                {selectedDisks.map(diskConfig => {
                  const disk = findDiskById(diskConfig.diskId);
                  return disk ? (
                    <div key={diskConfig.diskId} className="flex items-center justify-between p-2">
                      <div>
                        <p className="font-medium">
                          {disk.manufacturer} {disk.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {disk.capacityTB}TB {disk.diskType} | Interface: {disk.interface}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm bg-secondary px-2 py-1 rounded">
                          Qty: {diskConfig.quantity}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveDisk(diskConfig.diskId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="flex justify-between text-sm px-2 pt-2">
                <span>Total Disks:</span>
                <span>{selectedDisks.reduce((sum, disk) => sum + disk.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-sm px-2">
                <span>Total Capacity:</span>
                <span>
                  {selectedDisks.reduce((sum, diskConfig) => {
                    const disk = findDiskById(diskConfig.diskId);
                    return sum + (disk ? disk.capacityTB * diskConfig.quantity : 0);
                  }, 0).toLocaleString()} TB
                </span>
              </div>
              <div className="flex justify-between text-sm px-2">
                <span>Total Cost:</span>
                <span>
                  ${selectedDisks.reduce((sum, diskConfig) => {
                    const disk = findDiskById(diskConfig.diskId);
                    return sum + (disk ? disk.cost * diskConfig.quantity : 0);
                  }, 0).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>No disks configured</p>
              <p className="text-xs mt-1">Add disks to this storage node</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
