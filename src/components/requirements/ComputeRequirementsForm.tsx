
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
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Core Infrastructure</CardTitle>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Compute Clusters</CardTitle>
          <ComputeClusterForm 
            clusters={requirements.computeClusters || []}
            onUpdate={handleClustersUpdate}
            showAddButton={true}
          />
        </CardHeader>
        <CardContent>
          <ComputeClusterForm 
            clusters={requirements.computeClusters || []}
            onUpdate={handleClustersUpdate}
            showAddButton={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};
