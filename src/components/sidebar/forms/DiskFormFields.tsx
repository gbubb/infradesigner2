
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DiskType } from '@/types/infrastructure';

interface DiskFormFieldsProps {
  formValues: any;
  onChange: (name: string, value: any) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DiskFormFields: React.FC<DiskFormFieldsProps> = ({ 
  formValues, 
  onChange, 
  onInputChange 
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacityTB">Capacity (TB)</Label>
          <Input
            id="capacityTB"
            name="capacityTB"
            type="number"
            value={formValues.capacityTB || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="diskType">Disk Type</Label>
          <Select
            value={formValues.diskType?.toString() || ''}
            onValueChange={(value) => onChange('diskType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(DiskType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="formFactor">Form Factor</Label>
          <Select
            value={formValues.formFactor?.toString() || ''}
            onValueChange={(value) => onChange('formFactor', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select form factor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='2.5"'>2.5"</SelectItem>
              <SelectItem value='3.5"'>3.5"</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="interface">Interface</Label>
          <Select
            value={formValues.interface?.toString() || ''}
            onValueChange={(value) => onChange('interface', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select interface" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SATA">SATA</SelectItem>
              <SelectItem value="SAS">SAS</SelectItem>
              <SelectItem value="NVMe">NVMe</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {formValues.diskType === DiskType.HDD && (
        <div className="space-y-2">
          <Label htmlFor="rpm">RPM</Label>
          <Input
            id="rpm"
            name="rpm"
            type="number"
            value={formValues.rpm || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="iops">IOPS</Label>
          <Input
            id="iops"
            name="iops"
            type="number"
            value={formValues.iops || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="readSpeed">Read Speed (MB/s)</Label>
          <Input
            id="readSpeed"
            name="readSpeed"
            type="number"
            value={formValues.readSpeed || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="writeSpeed">Write Speed (MB/s)</Label>
          <Input
            id="writeSpeed"
            name="writeSpeed"
            type="number"
            value={formValues.writeSpeed || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
};
