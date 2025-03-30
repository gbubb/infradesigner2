
import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDesignStore } from '@/store/designStore';
import { Slider } from '@/components/ui/slider';
import { Calculator, Save } from 'lucide-react';

export const RequirementsPanel: React.FC = () => {
  const { requirements, updateRequirements } = useDesignStore();
  
  // Set default values when component mounts
  useEffect(() => {
    // Only set defaults if values are not already set
    const updatedRequirements = {
      computeRequirements: {
        ...requirements.computeRequirements,
        totalVCPUs: requirements.computeRequirements.totalVCPUs || 5000,
        totalMemoryTB: requirements.computeRequirements.totalMemoryTB || 30,
        availabilityZoneRedundancy: requirements.computeRequirements.availabilityZoneRedundancy || 'N+1',
        overcommitRatio: requirements.computeRequirements.overcommitRatio || 2
      },
      storageRequirements: {
        ...requirements.storageRequirements,
        totalCapacityTB: requirements.storageRequirements.totalCapacityTB || 100,
        availabilityZoneQuantity: requirements.storageRequirements.availabilityZoneQuantity || 3,
        poolType: requirements.storageRequirements.poolType || '3 Replica'
      },
      physicalConstraints: {
        ...requirements.physicalConstraints,
        rackQuantity: requirements.physicalConstraints.rackQuantity || 16,
        totalAvailabilityZones: requirements.physicalConstraints.totalAvailabilityZones || 8,
        racksPerAvailabilityZone: requirements.physicalConstraints.racksPerAvailabilityZone || 2,
        rackUnitsPerRack: requirements.physicalConstraints.rackUnitsPerRack || 42,
        powerPerRackWatts: requirements.physicalConstraints.powerPerRackWatts || 5000
      }
    };
    
    updateRequirements(updatedRequirements);
  }, []);
  
  const handleInputChange = (section: keyof typeof requirements, field: string, value: any) => {
    const sectionData = { ...requirements[section] } as any;
    sectionData[field] = value;
    
    updateRequirements({
      [section]: sectionData
    } as any);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Design Requirements</h2>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calculator className="h-4 w-4 mr-2" />
            Auto-Calculate
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Requirements
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compute Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Compute Requirements</CardTitle>
            <CardDescription>Define your processing needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vcpus">Total vCPUs</Label>
              <Input
                id="vcpus"
                type="number"
                value={requirements.computeRequirements.totalVCPUs || ''}
                onChange={(e) => handleInputChange('computeRequirements', 'totalVCPUs', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="memory">Total Memory (TB)</Label>
              <Input
                id="memory"
                type="number"
                step="0.1"
                value={requirements.computeRequirements.totalMemoryTB || ''}
                onChange={(e) => handleInputChange('computeRequirements', 'totalMemoryTB', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="availability">Availability Zone Redundancy</Label>
              <Select
                value={requirements.computeRequirements.availabilityZoneRedundancy || 'None'}
                onValueChange={(value) => handleInputChange('computeRequirements', 'availabilityZoneRedundancy', value)}
              >
                <SelectTrigger id="availability">
                  <SelectValue placeholder="Select redundancy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="N+1">N+1</SelectItem>
                  <SelectItem value="N+2">N+2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="overcommit">Overcommit Ratio: {requirements.computeRequirements.overcommitRatio || 1}:1</Label>
              </div>
              <Slider
                id="overcommit"
                min={1}
                max={10}
                step={1}
                value={[requirements.computeRequirements.overcommitRatio || 1]}
                onValueChange={(value) => handleInputChange('computeRequirements', 'overcommitRatio', value[0])}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Storage Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Requirements</CardTitle>
            <CardDescription>Define your storage needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Usable Capacity (TiB)</Label>
              <Input
                id="capacity"
                type="number"
                value={requirements.storageRequirements.totalCapacityTB || ''}
                onChange={(e) => handleInputChange('storageRequirements', 'totalCapacityTB', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="az-quantity">Availability Zone Quantity</Label>
              <Input
                id="az-quantity"
                type="number"
                min={1}
                value={requirements.storageRequirements.availabilityZoneQuantity || ''}
                onChange={(e) => handleInputChange('storageRequirements', 'availabilityZoneQuantity', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pool-type">Pool Type</Label>
              <Select
                value={requirements.storageRequirements.poolType || '3 Replica'}
                onValueChange={(value) => handleInputChange('storageRequirements', 'poolType', value)}
              >
                <SelectTrigger id="pool-type">
                  <SelectValue placeholder="Select pool type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3 Replica">3 Replica</SelectItem>
                  <SelectItem value="2 Replica">2 Replica</SelectItem>
                  <SelectItem value="Erasure Coding 4+2">Erasure Coding 4+2</SelectItem>
                  <SelectItem value="Erasure Coding 8+3">Erasure Coding 8+3</SelectItem>
                  <SelectItem value="Erasure Coding 8+4">Erasure Coding 8+4</SelectItem>
                  <SelectItem value="Erasure Coding 10+4">Erasure Coding 10+4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Network Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Network Requirements</CardTitle>
            <CardDescription>Define your connectivity topology</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="network-topology">Network Topology</Label>
              <Select
                value={requirements.networkRequirements.networkTopology || 'Spine-Leaf'}
                onValueChange={(value) => handleInputChange('networkRequirements', 'networkTopology', value)}
              >
                <SelectTrigger id="network-topology">
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
              <Label htmlFor="management-network">Management Network</Label>
              <Select
                value={requirements.networkRequirements.managementNetwork || 'Single connection'}
                onValueChange={(value) => handleInputChange('networkRequirements', 'managementNetwork', value)}
              >
                <SelectTrigger id="management-network">
                  <SelectValue placeholder="Select management network type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single connection">Single connection</SelectItem>
                  <SelectItem value="Dual Home">Dual Home</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ipmi-network">IPMI Network</Label>
              <Select
                value={requirements.networkRequirements.ipmiNetwork || 'Management converged'}
                onValueChange={(value) => handleInputChange('networkRequirements', 'ipmiNetwork', value)}
              >
                <SelectTrigger id="ipmi-network">
                  <SelectValue placeholder="Select IPMI network type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Management converged">Management converged</SelectItem>
                  <SelectItem value="Dedicated IPMI switch">Dedicated IPMI switch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Physical Constraints */}
        <Card>
          <CardHeader>
            <CardTitle>Physical Constraints</CardTitle>
            <CardDescription>Define your physical infrastructure limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rack-quantity">Rack Quantity</Label>
              <Input
                id="rack-quantity"
                type="number"
                value={requirements.physicalConstraints.rackQuantity || ''}
                onChange={(e) => handleInputChange('physicalConstraints', 'rackQuantity', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="total-azs">Total Availability Zones</Label>
              <Input
                id="total-azs"
                type="number"
                min={1}
                value={requirements.physicalConstraints.totalAvailabilityZones || ''}
                onChange={(e) => handleInputChange('physicalConstraints', 'totalAvailabilityZones', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="racks-per-az">Racks per Availability Zone</Label>
              <Input
                id="racks-per-az"
                type="number"
                min={1}
                value={requirements.physicalConstraints.racksPerAvailabilityZone || ''}
                onChange={(e) => handleInputChange('physicalConstraints', 'racksPerAvailabilityZone', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="rack-units">Rack Units per Rack</Label>
              <Input
                id="rack-units"
                type="number"
                value={requirements.physicalConstraints.rackUnitsPerRack || ''}
                onChange={(e) => handleInputChange('physicalConstraints', 'rackUnitsPerRack', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="power">Power per Rack (Watts)</Label>
              <Input
                id="power"
                type="number"
                value={requirements.physicalConstraints.powerPerRackWatts || ''}
                onChange={(e) => handleInputChange('physicalConstraints', 'powerPerRackWatts', Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
