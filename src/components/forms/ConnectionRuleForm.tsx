
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AZScope, ConnectionPattern, ConnectionRule } from '@/types/infrastructure/connection-rule-types';
import { ComponentType } from '@/types/infrastructure/component-types';
import { PortRole, PortSpeed, MediaType } from '@/types/infrastructure/port-types';
import { ConnectorType } from '@/types/infrastructure';

interface ConnectionRuleFormProps {
  rule?: ConnectionRule;
  onSubmit: (rule: ConnectionRule) => void;
  onCancel: () => void;
}

export const ConnectionRuleForm: React.FC<ConnectionRuleFormProps> = ({
  rule,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState<ConnectionRule>({
    id: rule?.id || crypto.randomUUID(),
    name: rule?.name || '',
    description: rule?.description || '',
    sourceDeviceCriteria: rule?.sourceDeviceCriteria || {
      componentType: undefined,
      role: '',
      minPorts: undefined,
      maxPorts: undefined,
      deviceNamePattern: '',
      excludeDevices: [],
    },
    sourcePortCriteria: rule?.sourcePortCriteria || {
      portRole: [],
      speed: undefined,
      mediaType: undefined,
      connectorType: undefined,
      minPorts: undefined,
      maxPorts: undefined,
      portNamePattern: '',
      excludePorts: [],
      requireUnused: false,
    },
    targetDeviceCriteria: rule?.targetDeviceCriteria || {
      componentType: undefined,
      role: '',
      minPorts: undefined,
      maxPorts: undefined,
      deviceNamePattern: '',
      excludeDevices: [],
    },
    targetPortCriteria: rule?.targetPortCriteria || {
      portRole: [],
      speed: undefined,
      mediaType: undefined,
      connectorType: undefined,
      minPorts: undefined,
      maxPorts: undefined,
      portNamePattern: '',
      excludePorts: [],
      requireUnused: false,
    },
    azScope: rule?.azScope || AZScope.AnyAZ,
    targetAZId: rule?.targetAZId || '',
    connectionPattern: rule?.connectionPattern || ConnectionPattern.ConnectToEachTarget,
    numberOfTargets: rule?.numberOfTargets || 1,
    cableId: rule?.cableId || '',
    enabled: rule?.enabled ?? true,
    maxConnections: rule?.maxConnections,
    connectionStrategy: rule?.connectionStrategy || 'all',
    bidirectional: rule?.bidirectional || false,
    priority: rule?.priority || 0,
    tags: rule?.tags || [],
  });

  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleTagAdd = () => {
    if (newTag && !formData.tags?.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag],
      }));
      setNewTag('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || [],
    }));
  };

  const renderDeviceCriteriaFields = (
    prefix: 'source' | 'target',
    criteria: ConnectionRule['sourceDeviceCriteria' | 'targetDeviceCriteria']
  ) => (
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
            onChange={(e) => {
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
            {Object.values(ComponentType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`${prefix}-role`}>Role</Label>
          <Input
            id={`${prefix}-role`}
            value={criteria.role || ''}
            placeholder="e.g., switch, server"
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                [`${prefix}DeviceCriteria`]: {
                  ...prev[`${prefix}DeviceCriteria`],
                  role: e.target.value,
                },
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-minPorts`}>Min Ports</Label>
          <Input
            id={`${prefix}-minPorts`}
            type="number"
            min={0}
            value={criteria.minPorts ?? ''}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                [`${prefix}DeviceCriteria`]: {
                  ...prev[`${prefix}DeviceCriteria`],
                  minPorts: e.target.value !== '' ? Number(e.target.value) : undefined,
                },
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-maxPorts`}>Max Ports</Label>
          <Input
            id={`${prefix}-maxPorts`}
            type="number"
            min={0}
            value={criteria.maxPorts ?? ''}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                [`${prefix}DeviceCriteria`]: {
                  ...prev[`${prefix}DeviceCriteria`],
                  maxPorts: e.target.value !== '' ? Number(e.target.value) : undefined,
                },
              }))
            }
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor={`${prefix}-deviceNamePattern`}>Device Name Pattern</Label>
          <Input
            id={`${prefix}-deviceNamePattern`}
            value={criteria.deviceNamePattern || ''}
            placeholder="Regex pattern for device names"
            onChange={e =>
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

  const renderPortCriteriaFields = (
    prefix: 'source' | 'target',
    criteria: ConnectionRule['sourcePortCriteria' | 'targetPortCriteria']
  ) => (
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
          <Label htmlFor={`${prefix}-mediaType`}>Media Type</Label>
          <select
            className="mt-1 block w-full border rounded px-3 py-2 bg-background"
            id={`${prefix}-mediaType`}
            value={criteria.mediaType || ''}
            onChange={e => {
              const value = e.target.value ? (e.target.value as MediaType) : undefined;
              setFormData(prev => ({
                ...prev,
                [`${prefix}PortCriteria`]: {
                  ...prev[`${prefix}PortCriteria`],
                  mediaType: value,
                },
              }));
            }}
          >
            <option value="">Any</option>
            {Object.values(MediaType).map(media => (
              <option key={media} value={media}>{media}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`${prefix}-connectorType`}>Connector Type</Label>
          <select
            className="mt-1 block w-full border rounded px-3 py-2 bg-background"
            id={`${prefix}-connectorType`}
            value={criteria.connectorType || ''}
            onChange={e => {
              const value = e.target.value ? (e.target.value as ConnectorType) : undefined;
              setFormData(prev => ({
                ...prev,
                [`${prefix}PortCriteria`]: {
                  ...prev[`${prefix}PortCriteria`],
                  connectorType: value,
                },
              }));
            }}
          >
            <option value="">Any</option>
            {Object.values(ConnectorType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor={`${prefix}-minPorts-port`}>Min Ports</Label>
          <Input
            id={`${prefix}-minPorts-port`}
            type="number"
            min={0}
            value={criteria.minPorts ?? ''}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                [`${prefix}PortCriteria`]: {
                  ...prev[`${prefix}PortCriteria`],
                  minPorts: e.target.value !== '' ? Number(e.target.value) : undefined,
                },
              }))
            }
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}-maxPorts-port`}>Max Ports</Label>
          <Input
            id={`${prefix}-maxPorts-port`}
            type="number"
            min={0}
            value={criteria.maxPorts ?? ''}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                [`${prefix}PortCriteria`]: {
                  ...prev[`${prefix}PortCriteria`],
                  maxPorts: e.target.value !== '' ? Number(e.target.value) : undefined,
                },
              }))
            }
          />
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
        <div className="md:col-span-2 flex items-center gap-2">
          <Switch
            checked={criteria.requireUnused}
            onCheckedChange={checked =>
              setFormData(prev => ({
                ...prev,
                [`${prefix}PortCriteria`]: {
                  ...prev[`${prefix}PortCriteria`],
                  requireUnused: checked,
                },
              }))
            }
            id={`${prefix}-requireUnused`}
          />
          <Label htmlFor={`${prefix}-requireUnused`} className="cursor-pointer">Require Unused Ports</Label>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label htmlFor="name" className="font-semibold">Rule Name</Label>
          <Input
            id="name"
            value={formData.name}
            placeholder="e.g., Connect Servers to Switch"
            onChange={e =>
              setFormData(prev => ({ ...prev, name: e.target.value }))
            }
            required
          />
        </div>
        <div className="space-y-4">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description || ''}
            placeholder="Describe the purpose of this connection rule"
            onChange={e =>
              setFormData(prev => ({ ...prev, description: e.target.value }))
            }
          />
        </div>
      </div>

      {renderDeviceCriteriaFields('source', formData.sourceDeviceCriteria)}
      {renderPortCriteriaFields('source', formData.sourcePortCriteria)}

      <div className="border-t my-4" />

      {renderDeviceCriteriaFields('target', formData.targetDeviceCriteria)}
      {renderPortCriteriaFields('target', formData.targetPortCriteria)}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="azScope">AZ Scope</Label>
          <select
            id="azScope"
            className="mt-1 block w-full border rounded px-3 py-2 bg-background"
            value={formData.azScope}
            onChange={e => setFormData(prev => ({ ...prev, azScope: e.target.value as AZScope }))}
          >
            {Object.values(AZScope).map(scope => (
              <option key={scope} value={scope}>{scope}</option>
            ))}
          </select>
        </div>
        {formData.azScope === AZScope.SpecificAZ && (
          <div>
            <Label htmlFor="targetAZId">Target AZ ID</Label>
            <Input
              id="targetAZId"
              value={formData.targetAZId || ''}
              placeholder="Enter target AZ ID"
              onChange={e =>
                setFormData(prev => ({ ...prev, targetAZId: e.target.value }))
              }
            />
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="connectionPattern">Connection Pattern</Label>
          <select
            id="connectionPattern"
            className="mt-1 block w-full border rounded px-3 py-2 bg-background"
            value={formData.connectionPattern}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                connectionPattern: e.target.value as ConnectionPattern,
              }))
            }
          >
            {Object.values(ConnectionPattern).map(pattern => (
              <option key={pattern} value={pattern}>
                {pattern}
              </option>
            ))}
          </select>
        </div>
        {formData.connectionPattern === ConnectionPattern.ConnectToNTargets && (
          <div>
            <Label htmlFor="numberOfTargets">Number of Targets</Label>
            <Input
              id="numberOfTargets"
              type="number"
              min={1}
              value={formData.numberOfTargets || 1}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  numberOfTargets: Number(e.target.value) || 1,
                }))
              }
            />
          </div>
        )}
        <div>
          <Label htmlFor="connectionStrategy">Connection Strategy</Label>
          <select
            id="connectionStrategy"
            className="mt-1 block w-full border rounded px-3 py-2 bg-background"
            value={formData.connectionStrategy || 'all'}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                connectionStrategy: e.target.value as 'all' | 'first' | 'random',
              }))
            }
          >
            <option value="all">All Possible Connections</option>
            <option value="first">First Match Only</option>
            <option value="random">Random Match</option>
          </select>
        </div>
        <div>
          <Label htmlFor="maxConnections">Max Connections</Label>
          <Input
            id="maxConnections"
            type="number"
            min={0}
            value={formData.maxConnections ?? ''}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                maxConnections: e.target.value !== '' ? Number(e.target.value) : undefined,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">0 means unlimited</p>
        </div>
        <div className="flex items-center gap-2 mt-8">
          <Switch
            checked={formData.bidirectional}
            onCheckedChange={checked =>
              setFormData(prev => ({
                ...prev,
                bidirectional: checked,
              }))
            }
            id="bidirectional"
          />
          <Label htmlFor="bidirectional" className="cursor-pointer">
            Bidirectional
          </Label>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            min={0}
            value={formData.priority || 0}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                priority: Number(e.target.value) || 0,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">Higher priority rules are processed first</p>
        </div>
      </div>
      {/* Tags */}
      <div>
        <Label>Tags</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            value={newTag}
            placeholder="Add a tag"
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleTagAdd();
              }
            }}
          />
          <Button type="button" size="sm" onClick={handleTagAdd}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.tags?.map(tag => (
            <Badge
              key={tag}
              className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1"
              variant="outline"
            >
              <span>{tag}</span>
              <button
                type="button"
                className="ml-1 text-xs text-red-500 hover:underline"
                onClick={() => handleTagRemove(tag)}
                aria-label="Remove tag"
              >
                ✕
              </button>
            </Badge>
          ))}
        </div>
      </div>
      {/* Enabled */}
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.enabled}
          onCheckedChange={checked =>
            setFormData(prev => ({
              ...prev,
              enabled: checked,
            }))
          }
          id="enabled"
        />
        <Label htmlFor="enabled" className="cursor-pointer">
          Enabled
        </Label>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {rule ? 'Update' : 'Create'} Rule
        </Button>
      </div>
    </form>
  );
};
