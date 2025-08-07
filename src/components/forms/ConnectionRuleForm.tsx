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
import { PortRole, PortSpeed } from '@/types/infrastructure/port-types';
import { DeviceCriteriaFields } from './DeviceCriteriaFields';
import { PortCriteriaFields } from './PortCriteriaFields';
import { useDesignStore } from '@/store/designStore';

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
  const activeDesign = useDesignStore(state => state.activeDesign);
  // Extract possible roles for dropdown (only unique, human-friendly roles)
  const availableRoles: string[] = Array.from(
    new Set(
      activeDesign?.componentRoles?.map(r => r.role).filter(Boolean) ?? []
    )
  );

  const [formData, setFormData] = useState<ConnectionRule>({
    id: rule?.id || crypto.randomUUID(),
    name: rule?.name || '',
    description: rule?.description || '',
    sourceDeviceCriteria: rule?.sourceDeviceCriteria
      ? {
          componentType: rule.sourceDeviceCriteria.componentType,
          role: rule.sourceDeviceCriteria.role,
          deviceNamePattern: rule.sourceDeviceCriteria.deviceNamePattern,
          excludeDevices: rule.sourceDeviceCriteria.excludeDevices,
        }
      : {
          componentType: undefined,
          role: '',
          deviceNamePattern: '',
          excludeDevices: [],
        },
    sourcePortCriteria: rule?.sourcePortCriteria
      ? {
          portRole: rule.sourcePortCriteria.portRole,
          speed: rule.sourcePortCriteria.speed,
          portNamePattern: rule.sourcePortCriteria.portNamePattern,
          excludePorts: rule.sourcePortCriteria.excludePorts,
          side: rule.sourcePortCriteria.side,
        }
      : {
          portRole: [],
          speed: undefined,
          portNamePattern: '',
          excludePorts: [],
          side: undefined,
        },
    targetDeviceCriteria: rule?.targetDeviceCriteria
      ? {
          componentType: rule.targetDeviceCriteria.componentType,
          role: rule.targetDeviceCriteria.role,
          deviceNamePattern: rule.targetDeviceCriteria.deviceNamePattern,
          excludeDevices: rule.targetDeviceCriteria.excludeDevices,
        }
      : {
          componentType: undefined,
          role: '',
          deviceNamePattern: '',
          excludeDevices: [],
        },
    targetPortCriteria: rule?.targetPortCriteria
      ? {
          portRole: rule.targetPortCriteria.portRole,
          speed: rule.targetPortCriteria.speed,
          portNamePattern: rule.targetPortCriteria.portNamePattern,
          excludePorts: rule.targetPortCriteria.excludePorts,
          side: rule.targetPortCriteria.side,
        }
      : {
          portRole: [],
          speed: undefined,
          portNamePattern: '',
          excludePorts: [],
          side: undefined,
        },
    azScope: rule?.azScope || AZScope.AnyAZ,
    targetAZId: rule?.targetAZId || '',
    connectionPattern: rule?.connectionPattern || ConnectionPattern.ConnectToEachTarget,
    numberOfTargets: rule?.numberOfTargets || 1,
    connectionsPerPair: rule?.connectionsPerPair || 1,
    cableId: rule?.cableId || '',
    enabled: rule?.enabled ?? true,
    maxConnections: rule?.maxConnections,
    connectionStrategy: rule?.connectionStrategy || 'all',
    tags: rule?.tags || [],
    useBreakout: rule?.useBreakout || false,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Label htmlFor="name" className="font-semibold">Rule Name</Label>
          <Input
            id="name"
            value={formData.name}
            placeholder="e.g., Connect Servers to Switch"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData(prev => ({ ...prev, description: e.target.value }))
            }
          />
        </div>
      </div>

      <DeviceCriteriaFields
        prefix="source"
        criteria={formData.sourceDeviceCriteria}
        setFormData={setFormData}
        availableRoles={availableRoles}
      />
      <PortCriteriaFields prefix="source" criteria={formData.sourcePortCriteria} setFormData={setFormData} />

      <div className="border-t my-4" />

      <DeviceCriteriaFields
        prefix="target"
        criteria={formData.targetDeviceCriteria}
        setFormData={setFormData}
        availableRoles={availableRoles}
      />
      <PortCriteriaFields prefix="target" criteria={formData.targetPortCriteria} setFormData={setFormData} />

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="azScope">AZ Scope</Label>
          <select
            id="azScope"
            className="mt-1 block w-full border rounded px-3 py-2 bg-background"
            value={formData.azScope}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, azScope: e.target.value as AZScope }))}
          >
            {Object.values(AZScope).map((scope: AZScope) => (
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFormData(prev => ({
                ...prev,
                connectionPattern: e.target.value as ConnectionPattern,
              }))
            }
          >
            {Object.values(ConnectionPattern).map((pattern: ConnectionPattern) => (
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({
                  ...prev,
                  numberOfTargets: Number(e.target.value) || 1,
                }))
              }
            />
          </div>
        )}
        {formData.connectionPattern === ConnectionPattern.ConnectToEachTarget && (
          <div>
            <Label htmlFor="connectionsPerPair">Connections Per Target Pair</Label>
            <Input
              id="connectionsPerPair"
              type="number"
              min={1}
              value={formData.connectionsPerPair || 1}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({
                  ...prev,
                  connectionsPerPair: Number(e.target.value) || 1,
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
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData(prev => ({
                ...prev,
                maxConnections: e.target.value !== '' ? Number(e.target.value) : undefined,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">0 means unlimited</p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="useBreakout"
            checked={formData.useBreakout || false}
            onCheckedChange={(checked: boolean) =>
              setFormData(prev => ({
                ...prev,
                useBreakout: checked,
              }))
            }
          />
          <Label htmlFor="useBreakout" className="cursor-pointer">
            Use Breakout Cables
          </Label>
        </div>
      </div>
      {/* Tags UI stays unchanged */}
      <div>
        <Label>Tags</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            value={newTag}
            placeholder="Add a tag"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTag(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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
          {formData.tags?.map((tag: string) => (
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
          onCheckedChange={(checked: boolean) =>
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
