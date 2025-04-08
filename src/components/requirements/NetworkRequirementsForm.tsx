
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface NetworkRequirementsProps {
  requirements: {
    networkTopology?: 'Spine-Leaf' | 'Three-Tier' | 'Core-Distribution-Access';
    managementNetwork?: 'Single connection' | 'Dual Home';
    ipmiNetwork?: 'Management converged' | 'Dedicated IPMI switch';
    physicalFirewalls?: boolean;
    leafSwitchesPerAZ?: number;
    dedicatedStorageNetwork?: boolean;
    dedicatedNetworkCoreRacks?: boolean;
    deviceLifespanYears?: number;
  };
  onUpdate: (networkRequirements: any) => void;
}

export const NetworkRequirementsForm: React.FC<NetworkRequirementsProps> = ({
  requirements,
  onUpdate,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value, 10);
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
        <CardTitle>Network Requirements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="networkTopology">Network Topology</Label>
            <Select
              value={requirements.networkTopology || 'Spine-Leaf'}
              onValueChange={(value) => handleSelectChange('networkTopology', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select network topology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Spine-Leaf">Spine-Leaf</SelectItem>
                <SelectItem value="Three-Tier">Three-Tier</SelectItem>
                <SelectItem value="Core-Distribution-Access">Core-Distribution-Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="managementNetwork">Management Network</Label>
            <Select
              value={requirements.managementNetwork || 'Single connection'}
              onValueChange={(value) => handleSelectChange('managementNetwork', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select management network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single connection">Single connection</SelectItem>
                <SelectItem value="Dual Home">Dual Home</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipmiNetwork">IPMI Network</Label>
            <Select
              value={requirements.ipmiNetwork || 'Management converged'}
              onValueChange={(value) => handleSelectChange('ipmiNetwork', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select IPMI network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Management converged">Management converged</SelectItem>
                <SelectItem value="Dedicated IPMI switch">Dedicated IPMI switch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-y-0 pt-4">
            <Label htmlFor="physicalFirewalls">Physical Firewalls</Label>
            <Switch
              id="physicalFirewalls"
              checked={requirements.physicalFirewalls || false}
              onCheckedChange={(checked) => handleSwitchChange('physicalFirewalls', checked)}
            />
          </div>
          
          {requirements.networkTopology === 'Spine-Leaf' && (
            <div className="space-y-2">
              <Label htmlFor="leafSwitchesPerAZ">Leaf Switches per AZ</Label>
              <Input
                id="leafSwitchesPerAZ"
                name="leafSwitchesPerAZ"
                type="number"
                min="2"
                placeholder="e.g., 2"
                value={requirements.leafSwitchesPerAZ || ''}
                onChange={handleInputChange}
              />
            </div>
          )}
          
          <div className="flex items-center justify-between space-y-0 pt-4">
            <Label htmlFor="dedicatedStorageNetwork">Dedicated Storage Network</Label>
            <Switch
              id="dedicatedStorageNetwork"
              checked={requirements.dedicatedStorageNetwork || false}
              onCheckedChange={(checked) => handleSwitchChange('dedicatedStorageNetwork', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between space-y-0 pt-4">
            <Label htmlFor="dedicatedNetworkCoreRacks">Dedicated Network Core Racks</Label>
            <Switch
              id="dedicatedNetworkCoreRacks"
              checked={requirements.dedicatedNetworkCoreRacks || false}
              onCheckedChange={(checked) => handleSwitchChange('dedicatedNetworkCoreRacks', checked)}
            />
          </div>
          
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
  );
};
