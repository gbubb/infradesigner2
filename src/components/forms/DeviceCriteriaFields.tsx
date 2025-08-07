
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ComponentType } from '@/types/infrastructure/component-types';
import { ConnectionRule } from '@/types/infrastructure/connection-rule-types';

interface DeviceCriteriaFieldsProps {
  prefix: 'source' | 'target';
  criteria: ConnectionRule['sourceDeviceCriteria' | 'targetDeviceCriteria'];
  setFormData: React.Dispatch<React.SetStateAction<ConnectionRule>>;
  availableRoles?: string[];
}

export const DeviceCriteriaFields: React.FC<DeviceCriteriaFieldsProps> = ({
  prefix,
  criteria,
  setFormData,
  availableRoles = [],
}) => (
  <div className="space-y-4 border rounded-md p-4">
    <h3 className="font-medium text-lg mb-2">
      {prefix === 'source' ? 'Source' : 'Target'} Device Criteria
    </h3>
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor={`${prefix}-componentType`}>Component Type</Label>
        <select
          className="mt-1 block w-full border rounded px-3 py-2 bg-background"
          id={`${prefix}-componentType`}
          value={criteria.componentType || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const value = e.target.value ? (e.target.value as ComponentType) : undefined;
            setFormData(prev => ({
              ...prev,
              [`${prefix}DeviceCriteria`]: {
                ...prev[`${prefix}DeviceCriteria`],
                componentType: value,
              },
            }));
          }}
        >
          <option value="">Any</option>
          {Object.values(ComponentType).map((type: ComponentType) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`${prefix}-role`}>Role</Label>
        <select
          className="mt-1 block w-full border rounded px-3 py-2 bg-background"
          id={`${prefix}-role`}
          value={criteria.role || ''}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            setFormData(prev => ({
              ...prev,
              [`${prefix}DeviceCriteria`]: {
                ...prev[`${prefix}DeviceCriteria`],
                role: e.target.value,
              },
            }))
          }
        >
          <option value="">Any</option>
          {availableRoles.map((role: string) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor={`${prefix}-deviceNamePattern`}>Device Name Pattern</Label>
        <Input
          id={`${prefix}-deviceNamePattern`}
          value={criteria.deviceNamePattern || ''}
          placeholder="Regex pattern for device names"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData(prev => ({
              ...prev,
              [`${prefix}DeviceCriteria`]: {
                ...prev[`${prefix}DeviceCriteria`],
                deviceNamePattern: e.target.value,
              },
            }))
          }
        />
        <p className="text-xs text-muted-foreground">Use regex pattern to match device names</p>
      </div>
    </div>
  </div>
);
