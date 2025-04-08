
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ComputeClusterForm } from './ComputeClusterForm';
import { ComputeClusterRequirement } from '@/types/infrastructure';

interface ComputeRequirementsProps {
  requirements: {
    computeClusters: ComputeClusterRequirement[];
    controllerNodeCount?: number;
    infrastructureClusterRequired?: boolean;
    infrastructureNodeCount?: number;
    deviceLifespanYears?: number;
  };
  onUpdate: (computeRequirements: any) => void;
}

export const ComputeRequirementsForm: React.FC<ComputeRequirementsProps> = ({
  requirements,
  onUpdate,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value, 10);
      
    onUpdate({ [name]: isNaN(numericValue) ? undefined : numericValue });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    onUpdate({ [name]: checked });
  };

  const handleClustersUpdate = (clusters: ComputeClusterRequirement[]) => {
    onUpdate({ computeClusters: clusters });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Core Infrastructure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            
            <div className="space-y-2">
              <Label htmlFor="deviceLifespanYears">Device Lifespan (Years)</Label>
              <Input
                id="deviceLifespanYears"
                name="deviceLifespanYears"
                type="number"
                min="2"
                max="6"
                placeholder="3"
                value={requirements.deviceLifespanYears || ''}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <ComputeClusterForm 
        clusters={requirements.computeClusters || []}
        onUpdate={handleClustersUpdate}
      />
    </div>
  );
};
