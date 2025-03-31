
import React, { useState } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ComponentType, GPU } from '@/types/infrastructure';

interface GPUConfigurationProps {
  roleId: string;
}

export function GPUConfiguration({ roleId }: GPUConfigurationProps) {
  const { componentTemplates, selectedGPUsByRole, addGPUToComputeNode, removeGPUFromComputeNode } = useDesignStore();
  const [selectedGpuId, setSelectedGpuId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Filter GPU components
  const gpuOptions = componentTemplates.filter(
    (component): component is GPU => component.type === ComponentType.GPU
  );

  // Get GPUs assigned to this role
  const roleGPUs = selectedGPUsByRole[roleId] || [];

  // Add GPU to compute node
  const handleAddGPU = () => {
    if (selectedGpuId && quantity > 0) {
      addGPUToComputeNode(roleId, selectedGpuId, quantity);
      setSelectedGpuId('');
      setQuantity(1);
    }
  };

  // Remove GPU from compute node
  const handleRemoveGPU = (gpuId: string) => {
    removeGPUFromComputeNode(roleId, gpuId);
  };

  // Find GPU component by ID
  const findGPUById = (id: string) => {
    return gpuOptions.find(gpu => gpu.id === id);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">GPU Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-6">
              <label className="text-sm mb-1 block">GPU Model</label>
              <Select value={selectedGpuId} onValueChange={setSelectedGpuId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select GPU model" />
                </SelectTrigger>
                <SelectContent>
                  {gpuOptions.map(gpu => (
                    <SelectItem key={gpu.id} value={gpu.id}>
                      {gpu.manufacturer} {gpu.name} ({gpu.memoryGB}GB)
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
                onClick={handleAddGPU} 
                disabled={!selectedGpuId || quantity < 1}
                className="w-full"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {roleGPUs.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Assigned GPUs</h4>
              <div className="border rounded-md divide-y">
                {roleGPUs.map(gpuConfig => {
                  const gpu = findGPUById(gpuConfig.gpuId);
                  return gpu ? (
                    <div key={gpuConfig.gpuId} className="flex items-center justify-between p-2">
                      <div>
                        <p className="font-medium">
                          {gpu.manufacturer} {gpu.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {gpu.memoryGB}GB {gpu.memoryType} | TDP: {gpu.tdpWatts}W
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm bg-secondary px-2 py-1 rounded">
                          Qty: {gpuConfig.quantity}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveGPU(gpuConfig.gpuId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
              <div className="flex justify-between text-sm px-2 pt-2">
                <span>Total GPUs:</span>
                <span>{roleGPUs.reduce((sum, gpu) => sum + gpu.quantity, 0)}</span>
              </div>
              <div className="flex justify-between text-sm px-2">
                <span>Total Cost:</span>
                <span>
                  ${roleGPUs.reduce((sum, gpuConfig) => {
                    const gpu = findGPUById(gpuConfig.gpuId);
                    return sum + (gpu ? gpu.cost * gpuConfig.quantity : 0);
                  }, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm px-2">
                <span>Total Power:</span>
                <span>
                  {roleGPUs.reduce((sum, gpuConfig) => {
                    const gpu = findGPUById(gpuConfig.gpuId);
                    return sum + (gpu ? gpu.powerRequired * gpuConfig.quantity : 0);
                  }, 0).toLocaleString()} W
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-4">
              <p>No GPUs configured</p>
              <p className="text-xs mt-1">Add GPUs to this compute node</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
