
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDesignStore } from '@/store/designStore';
import { DesignRequirements } from '@/types/infrastructure';
import { Slider } from '@/components/ui/slider';
import { Calculator, Save } from 'lucide-react';

export const RequirementsPanel: React.FC = () => {
  const { requirements, updateRequirements } = useDesignStore();
  
  const handleInputChange = (section: keyof DesignRequirements, field: string, value: any) => {
    const sectionData = { ...requirements[section] } as any;
    sectionData[field] = value;
    
    updateRequirements({
      [section]: sectionData
    } as Partial<DesignRequirements>);
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
              <Label htmlFor="memory">Total Memory (GB)</Label>
              <Input
                id="memory"
                type="number"
                value={requirements.computeRequirements.totalMemoryGB || ''}
                onChange={(e) => handleInputChange('computeRequirements', 'totalMemoryGB', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="compute-redundancy">Redundancy Factor</Label>
              <Select
                value={requirements.computeRequirements.redundancyFactor?.toString() || '1'}
                onValueChange={(value) => handleInputChange('computeRequirements', 'redundancyFactor', Number(value))}
              >
                <SelectTrigger id="compute-redundancy">
                  <SelectValue placeholder="Select redundancy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">N (No redundancy)</SelectItem>
                  <SelectItem value="1.5">N+1</SelectItem>
                  <SelectItem value="2">N+2</SelectItem>
                  <SelectItem value="3">2N (Full redundancy)</SelectItem>
                </SelectContent>
              </Select>
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
              <Label htmlFor="capacity">Total Capacity (TB)</Label>
              <Input
                id="capacity"
                type="number"
                value={requirements.storageRequirements.totalCapacityTB || ''}
                onChange={(e) => handleInputChange('storageRequirements', 'totalCapacityTB', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="iops">Performance (IOPS)</Label>
              <Input
                id="iops"
                type="number"
                value={requirements.storageRequirements.performanceIOPS || ''}
                onChange={(e) => handleInputChange('storageRequirements', 'performanceIOPS', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="storage-redundancy">Redundancy Level</Label>
              <Select
                value={requirements.storageRequirements.redundancyLevel || 'RAID5'}
                onValueChange={(value) => handleInputChange('storageRequirements', 'redundancyLevel', value)}
              >
                <SelectTrigger id="storage-redundancy">
                  <SelectValue placeholder="Select redundancy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RAID0">RAID 0 (Striping, no redundancy)</SelectItem>
                  <SelectItem value="RAID1">RAID 1 (Mirroring)</SelectItem>
                  <SelectItem value="RAID5">RAID 5 (Single parity)</SelectItem>
                  <SelectItem value="RAID6">RAID 6 (Dual parity)</SelectItem>
                  <SelectItem value="RAID10">RAID 10 (Striped mirrors)</SelectItem>
                  <SelectItem value="ErasureCoding">Erasure Coding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Network Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Network Requirements</CardTitle>
            <CardDescription>Define your connectivity needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bandwidth">Total Bandwidth (Gbps)</Label>
              <Input
                id="bandwidth"
                type="number"
                value={requirements.networkRequirements.totalBandwidthGbps || ''}
                onChange={(e) => handleInputChange('networkRequirements', 'totalBandwidthGbps', Number(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="network-redundancy">Redundancy Level</Label>
              <Select
                value={requirements.networkRequirements.redundancyLevel || 'Dual-homed'}
                onValueChange={(value) => handleInputChange('networkRequirements', 'redundancyLevel', value)}
              >
                <SelectTrigger id="network-redundancy">
                  <SelectValue placeholder="Select redundancy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single connection</SelectItem>
                  <SelectItem value="Dual-homed">Dual-homed</SelectItem>
                  <SelectItem value="MLAG">MLAG</SelectItem>
                  <SelectItem value="Meshed">Fully meshed</SelectItem>
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
              <Label htmlFor="racks">Available Racks</Label>
              <Input
                id="racks"
                type="number"
                value={requirements.physicalConstraints.availableRacks || ''}
                onChange={(e) => handleInputChange('physicalConstraints', 'availableRacks', Number(e.target.value))}
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
            
            <div className="space-y-2">
              <Label htmlFor="cooling">Cooling Capacity (BTU)</Label>
              <Input
                id="cooling"
                type="number"
                value={requirements.physicalConstraints.coolingBTU || ''}
                onChange={(e) => handleInputChange('physicalConstraints', 'coolingBTU', Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
