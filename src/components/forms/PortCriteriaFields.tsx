
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PortRole, PortSpeed, PortSide } from '@/types/infrastructure/port-types';
import { ConnectionRule } from '@/types/infrastructure/connection-rule-types';

interface PortCriteriaFieldsProps {
  prefix: 'source' | 'target';
  criteria: ConnectionRule['sourcePortCriteria' | 'targetPortCriteria'];
  setFormData: React.Dispatch<React.SetStateAction<ConnectionRule>>;
}

export const PortCriteriaFields: React.FC<PortCriteriaFieldsProps> = ({
  prefix,
  criteria,
  setFormData,
}) => (
  <div className="space-y-4 border rounded-md p-4">
    <h3 className="font-medium text-lg mb-2">
      {prefix === 'source' ? 'Source' : 'Target'} Port Criteria
    </h3>
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor={`${prefix}-portRole`}>Port Role</Label>
        <select
          className="mt-1 block w-full border rounded px-3 py-2 bg-background"
          id={`${prefix}-portRole`}
          value={criteria.portRole?.[0] || ''}
          onChange={e => {
            const value = e.target.value ? [e.target.value as PortRole] : [];
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                portRole: value,
              },
            }));
          }}
        >
          <option value="">Any</option>
          {Object.values(PortRole).map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`${prefix}-speed`}>Speed</Label>
        <select
          className="mt-1 block w-full border rounded px-3 py-2 bg-background"
          id={`${prefix}-speed`}
          value={criteria.speed || ''}
          onChange={e => {
            const value = e.target.value ? (e.target.value as PortSpeed) : undefined;
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                speed: value,
              },
            }));
          }}
        >
          <option value="">Any</option>
          {Object.values(PortSpeed).map(speed => (
            <option key={speed} value={speed}>{speed}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor={`${prefix}-side`}>Port Side</Label>
        <select
          className="mt-1 block w-full border rounded px-3 py-2 bg-background"
          id={`${prefix}-side`}
          value={criteria.side || ''}
          onChange={e => {
            const value = e.target.value ? (e.target.value as PortSide) : undefined;
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                side: value,
              },
            }));
          }}
        >
          <option value="">Any (Default: Front)</option>
          <option value={PortSide.Front}>Front Side</option>
          <option value={PortSide.Back}>Back Side</option>
        </select>
        <p className="text-xs text-muted-foreground">For patch panels and cassettes</p>
      </div>
      <div className="md:col-span-2">
        <Label htmlFor={`${prefix}-portNamePattern`}>Port Name Pattern</Label>
        <Input
          id={`${prefix}-portNamePattern`}
          value={criteria.portNamePattern || ''}
          placeholder="Regex pattern for port names"
          onChange={e =>
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                portNamePattern: e.target.value,
              },
            }))
          }
        />
        <p className="text-xs text-muted-foreground">Use regex pattern to match port names</p>
      </div>
    </div>
  </div>
);

