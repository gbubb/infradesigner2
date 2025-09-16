
import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { NetworkTopology } from '@/types/infrastructure';
import { toast } from 'sonner';

export const NetworkRequirementsForm = ({ requirements, onUpdate }) => {
  const isConvergedManagement = requirements.managementNetwork === 'Converged Management Plane';
  
  // Updated to not enforce IPMI network to be "Management converged" when using converged management
  useEffect(() => {
    // Check if IPMI network is not set at all, and set a default value
    if (!requirements.ipmiNetwork) {
      onUpdate({
        ...requirements,
        ipmiNetwork: 'Dedicated IPMI switch'
      });
    }
  }, [isConvergedManagement, onUpdate, requirements]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const numericValue = parseInt(value, 10);
    onUpdate({
      ...requirements,
      [name]: isNaN(numericValue) ? undefined : numericValue,
    });
  };

  const handleSelectChange = (field, value) => {
    onUpdate({
      ...requirements,
      [field]: value,
    });
  };

  const handleSwitchChange = (field, checked) => {
    onUpdate({
      ...requirements,
      [field]: checked,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Network Topology</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="networkTopology">Network Topology</Label>
            <Select
              value={requirements.networkTopology}
              onValueChange={(value) => handleSelectChange('networkTopology', value as NetworkTopology)}
            >
              <SelectTrigger id="networkTopology">
                <SelectValue placeholder="Select topology" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Spine-Leaf">Spine-Leaf (CLOS)</SelectItem>
                <SelectItem value="Three-Tier">Three-Tier</SelectItem>
                <SelectItem value="Core-Distribution-Access">Core-Distribution-Access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leafSwitchesPerAZ">Leaf Switches Per AZ</Label>
              <Input
                id="leafSwitchesPerAZ"
                name="leafSwitchesPerAZ"
                type="number"
                min="1"
                placeholder="e.g., 2"
                value={requirements.leafSwitchesPerAZ || ''}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deviceLifespanYears">Device Lifespan (years)</Label>
              <Input
                id="deviceLifespanYears"
                name="deviceLifespanYears"
                type="number"
                min="2"
                max="6"
                placeholder="3"
                value={requirements.deviceLifespanYears === undefined ? 3 : requirements.deviceLifespanYears}
                onChange={handleInputChange}
              />
            </div>
          </div>

          {requirements.networkTopology === 'Spine-Leaf' && (
            <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
              <div>
                <h4 className="text-sm font-medium">Include Border Leaf Switches</h4>
                <p className="text-sm text-muted-foreground">Add border leaf switches to connect to external networks (typically 2 switches)</p>
              </div>
              <Switch
                checked={requirements.includeBorderLeafSwitches !== false}
                onCheckedChange={(checked) => handleSwitchChange('includeBorderLeafSwitches', checked)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="managementNetwork">Management Network</Label>
            <Select
              value={requirements.managementNetwork}
              onValueChange={(value) => handleSelectChange('managementNetwork', value)}
            >
              <SelectTrigger id="managementNetwork">
                <SelectValue placeholder="Select configuration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single connection">Single connection</SelectItem>
                <SelectItem value="Dual Home">Dual Home (Redundant)</SelectItem>
                <SelectItem value="Converged Management Plane">Converged Management Plane</SelectItem>
              </SelectContent>
            </Select>
            {isConvergedManagement && (
              <p className="text-xs text-muted-foreground mt-1">
                Converged management uses the leaf switches for management traffic, eliminating the need for separate management switches
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipmiNetwork">IPMI Network</Label>
            <Select
              value={requirements.ipmiNetwork}
              onValueChange={(value) => handleSelectChange('ipmiNetwork', value)}
            >
              <SelectTrigger id="ipmiNetwork">
                <SelectValue placeholder="Select configuration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Management converged">Management converged</SelectItem>
                <SelectItem value="Dedicated IPMI switch">Dedicated IPMI switches</SelectItem>
              </SelectContent>
            </Select>
            {isConvergedManagement && (
              <p className="text-xs text-muted-foreground mt-1">
                When using converged management, IPMI traffic still requires its own network path for security
              </p>
            )}
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
            <div>
              <h4 className="text-sm font-medium">Physical Firewalls</h4>
              <p className="text-sm text-muted-foreground">Include dedicated physical firewalls</p>
            </div>
            <Switch
              checked={requirements.physicalFirewalls || false}
              onCheckedChange={(checked) => handleSwitchChange('physicalFirewalls', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
            <div>
              <h4 className="text-sm font-medium">Dedicated Storage Network</h4>
              <p className="text-sm text-muted-foreground">Use dedicated switches for storage traffic</p>
            </div>
            <Switch
              checked={requirements.dedicatedStorageNetwork || false}
              onCheckedChange={(checked) => handleSwitchChange('dedicatedStorageNetwork', checked)}
            />
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
            <div>
              <h4 className="text-sm font-medium">Dedicated Network Core Racks</h4>
              <p className="text-sm text-muted-foreground">Place core network in dedicated racks</p>
            </div>
            <Switch
              checked={requirements.dedicatedNetworkCoreRacks || false}
              onCheckedChange={(checked) => handleSwitchChange('dedicatedNetworkCoreRacks', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Structured Cabling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2 rounded-md border p-4">
            <div>
              <h4 className="text-sm font-medium">Enable Structured Cabling</h4>
              <p className="text-sm text-muted-foreground">Include patch panels for cable management</p>
            </div>
            <Switch
              checked={requirements.structuredCablingEnabled || false}
              onCheckedChange={(checked) => handleSwitchChange('structuredCablingEnabled', checked)}
            />
          </div>

          {requirements.structuredCablingEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="copperPatchPanelsPerAZ">Copper Patch Panels Per AZ</Label>
                <Input
                  id="copperPatchPanelsPerAZ"
                  name="copperPatchPanelsPerAZ"
                  type="number"
                  min="0"
                  placeholder="e.g., 2"
                  value={requirements.copperPatchPanelsPerAZ || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fiberPatchPanelsPerAZ">Fiber Patch Panels Per AZ</Label>
                <Input
                  id="fiberPatchPanelsPerAZ"
                  name="fiberPatchPanelsPerAZ"
                  type="number"
                  min="0"
                  placeholder="e.g., 2"
                  value={requirements.fiberPatchPanelsPerAZ || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="copperPatchPanelsPerCoreRack">Copper Patch Panels Per Core Rack</Label>
                <Input
                  id="copperPatchPanelsPerCoreRack"
                  name="copperPatchPanelsPerCoreRack"
                  type="number"
                  min="0"
                  placeholder="e.g., 1"
                  value={requirements.copperPatchPanelsPerCoreRack || ''}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fiberPatchPanelsPerCoreRack">Fiber Patch Panels Per Core Rack</Label>
                <Input
                  id="fiberPatchPanelsPerCoreRack"
                  name="fiberPatchPanelsPerCoreRack"
                  type="number"
                  min="0"
                  placeholder="e.g., 1"
                  value={requirements.fiberPatchPanelsPerCoreRack || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
