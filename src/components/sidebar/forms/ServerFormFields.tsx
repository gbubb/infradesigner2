
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServerRole, DiskSlotType, NetworkPortType } from '@/types/infrastructure';

interface ServerFormFieldsProps {
  formValues: any;
  onChange: (name: string, value: any) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ServerFormFields: React.FC<ServerFormFieldsProps> = ({ 
  formValues, 
  onChange, 
  onInputChange 
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="serverRole">Server Role</Label>
        <Select
          value={formValues.serverRole?.toString() || ''}
          onValueChange={(value) => onChange('serverRole', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(ServerRole).map((role) => (
              <SelectItem key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpuModel">CPU Model</Label>
          <Input
            id="cpuModel"
            name="cpuModel"
            value={formValues.cpuModel || ''}
            onChange={onInputChange}
            placeholder="CPU Model"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cpuSockets">CPU Sockets</Label>
          <Input
            id="cpuSockets"
            name="cpuSockets"
            type="number"
            value={formValues.cpuSockets || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpuCoresPerSocket">Cores per Socket</Label>
          <Input
            id="cpuCoresPerSocket"
            name="cpuCoresPerSocket"
            type="number"
            value={formValues.cpuCoresPerSocket || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="memoryCapacity">Memory (GB)</Label>
          <Input
            id="memoryCapacity"
            name="memoryCapacity"
            type="number"
            value={formValues.memoryCapacity || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="diskSlotType">Disk Slot Type</Label>
          <Select
            value={formValues.diskSlotType?.toString() || ''}
            onValueChange={(value) => onChange('diskSlotType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(DiskSlotType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="diskSlotQuantity">Disk Slots</Label>
          <Input
            id="diskSlotQuantity"
            name="diskSlotQuantity"
            type="number"
            value={formValues.diskSlotQuantity || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ruSize">RU Size</Label>
          <Input
            id="ruSize"
            name="ruSize"
            type="number"
            value={formValues.ruSize || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="networkPortType">Network Port Type</Label>
          <Select
            value={formValues.networkPortType?.toString() || ''}
            onValueChange={(value) => onChange('networkPortType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(NetworkPortType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="portsConsumedQuantity">Ports Consumed</Label>
          <Input
            id="portsConsumedQuantity"
            name="portsConsumedQuantity"
            type="number"
            value={formValues.portsConsumedQuantity || 0}
            onChange={onInputChange}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
};
