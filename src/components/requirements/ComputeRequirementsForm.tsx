
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ComputeRequirementsProps {
  requirements: {
    totalVCPUs?: number;
    totalMemoryTB?: number;
    availabilityZoneRedundancy?: 'None' | 'N+1' | 'N+2';
    overcommitRatio?: number;
    controllerNodeCount?: number;
    infrastructureClusterRequired?: boolean;
    infrastructureNodeCount?: number;
  };
  onUpdate: (computeRequirements: any) => void;
}

export const ComputeRequirementsForm: React.FC<ComputeRequirementsProps> = ({
  requirements,
  onUpdate,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = name === 'overcommitRatio' ? 
      parseFloat(value) :
      parseInt(value, 10);
      
    onUpdate({ [name]: isNaN(numericValue) ? undefined : numericValue });
  };

  const handleSelectChange = (name: string, value: string) => {
    onUpdate({ [name]: value });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    onUpdate({ [name]: checked });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compute Requirements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalVCPUs">Total vCPUs</Label>
            <Input
              id="totalVCPUs"
              name="totalVCPUs"
              type="number"
              placeholder="e.g., 5000"
              value={requirements.totalVCPUs || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalMemoryTB">Total Memory (TB)</Label>
            <Input
              id="totalMemoryTB"
              name="totalMemoryTB"
              type="number"
              placeholder="e.g., 30"
              value={requirements.totalMemoryTB || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availabilityZoneRedundancy">Availability Zone Redundancy</Label>
            <Select
              value={requirements.availabilityZoneRedundancy || 'None'}
              onValueChange={(value) => handleSelectChange('availabilityZoneRedundancy', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select redundancy level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None (No additional capacity)</SelectItem>
                <SelectItem value="N+1">N+1 (One additional AZ worth of capacity)</SelectItem>
                <SelectItem value="N+2">N+2 (Two additional AZs worth of capacity)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Determines additional compute capacity beyond what's needed for core operations. 
              First, compute is distributed evenly across all AZs. Then, N+1 adds one extra AZ 
              worth of capacity, N+2 adds two extra AZs worth of capacity. Total node count will 
              always be divisible by the number of AZs.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="overcommitRatio">
              CPU Overcommit Ratio (vCPU:Core)
            </Label>
            <Input
              id="overcommitRatio"
              name="overcommitRatio"
              type="number"
              min="1"
              max="10"
              step="0.5"
              placeholder="e.g., 2.0"
              value={requirements.overcommitRatio || ''}
              onChange={handleInputChange}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ratio of virtual CPUs to physical cores. Higher values mean more VMs per physical core.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="controllerNodeCount">Controller Node Count</Label>
            <Input
              id="controllerNodeCount"
              name="controllerNodeCount"
              type="number"
              min="1"
              placeholder="e.g., 3"
              value={requirements.controllerNodeCount || ''}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="flex items-center justify-between space-y-0 pt-4">
            <Label htmlFor="infrastructureClusterRequired">Infrastructure Cluster Required</Label>
            <Switch
              id="infrastructureClusterRequired"
              checked={requirements.infrastructureClusterRequired || false}
              onCheckedChange={(checked) => handleSwitchChange('infrastructureClusterRequired', checked)}
            />
          </div>
          
          {requirements.infrastructureClusterRequired && (
            <div className="space-y-2">
              <Label htmlFor="infrastructureNodeCount">Infrastructure Node Count</Label>
              <Input
                id="infrastructureNodeCount"
                name="infrastructureNodeCount"
                type="number"
                min="1"
                placeholder="e.g., 3"
                value={requirements.infrastructureNodeCount || ''}
                onChange={handleInputChange}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
