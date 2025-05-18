import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  Switch,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Tag,
  TagLabel,
  TagCloseButton,
  HStack,
  VStack,
  Divider,
  Heading,
  Text,
  useToast,
} from '@chakra-ui/react';
import { ConnectionRule, AZScope, ConnectionPattern } from '@/types/infrastructure/connection-rule-types';
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
  const toast = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleTagAdd = () => {
    if (newTag && !formData.tags?.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag]
      }));
      setNewTag('');
    }
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const renderDeviceCriteriaFields = (
    prefix: 'source' | 'target',
    criteria: ConnectionRule['sourceDeviceCriteria' | 'targetDeviceCriteria']
  ) => (
    <VStack spacing={4} align="stretch" p={4} borderWidth={1} borderRadius="md">
      <Heading size="sm">{prefix === 'source' ? 'Source' : 'Target'} Device Criteria</Heading>
      
      <FormControl>
        <FormLabel>Component Type</FormLabel>
        <Select
          value={criteria.componentType || ''}
          onChange={(e) => {
            const value = e.target.value ? (e.target.value as ComponentType) : undefined;
            setFormData(prev => ({
              ...prev,
              [`${prefix}DeviceCriteria`]: {
                ...prev[`${prefix}DeviceCriteria`],
                componentType: value
              }
            }));
          }}
        >
          <option value="">Any</option>
          {Object.values(ComponentType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Role</FormLabel>
        <Input
          value={criteria.role || ''}
          onChange={(e) => {
            setFormData(prev => ({
              ...prev,
              [`${prefix}DeviceCriteria`]: {
                ...prev[`${prefix}DeviceCriteria`],
                role: e.target.value
              }
            }));
          }}
          placeholder="e.g., switch, server"
        />
      </FormControl>

      <FormControl>
        <FormLabel>Min Ports</FormLabel>
        <NumberInput
          min={0}
          value={criteria.minPorts || ''}
          onChange={(_, value) => {
            setFormData(prev => ({
              ...prev,
              [`${prefix}DeviceCriteria`]: {
                ...prev[`${prefix}DeviceCriteria`],
                minPorts: value
              }
            }));
          }}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <FormControl>
        <FormLabel>Max Ports</FormLabel>
        <NumberInput
          min={0}
          value={criteria.maxPorts || ''}
          onChange={(_, value) => {
            setFormData(prev => ({
              ...prev,
              [`${prefix}DeviceCriteria`]: {
                ...prev[`${prefix}DeviceCriteria`],
                maxPorts: value
              }
            }));
          }}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <FormControl>
        <FormLabel>Device Name Pattern</FormLabel>
        <Input
          value={criteria.deviceNamePattern || ''}
          onChange={(e) => {
            setFormData(prev => ({
              ...prev,
              [`${prefix}DeviceCriteria`]: {
                ...prev[`${prefix}DeviceCriteria`],
                deviceNamePattern: e.target.value
              }
            }));
          }}
          placeholder="Regex pattern for device names"
        />
        <FormHelperText>Use regex pattern to match device names</FormHelperText>
      </FormControl>
    </VStack>
  );

  const renderPortCriteriaFields = (
    prefix: 'source' | 'target',
    criteria: ConnectionRule['sourcePortCriteria' | 'targetPortCriteria']
  ) => (
    <VStack spacing={4} align="stretch" p={4} borderWidth={1} borderRadius="md">
      <Heading size="sm">{prefix === 'source' ? 'Source' : 'Target'} Port Criteria</Heading>

      <FormControl>
        <FormLabel>Port Role</FormLabel>
        <Select
          value={criteria.portRole?.[0] || ''}
          onChange={(e) => {
            const value = e.target.value ? [e.target.value as PortRole] : [];
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                portRole: value
              }
            }));
          }}
        >
          <option value="">Any</option>
          {Object.values(PortRole).map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Speed</FormLabel>
        <Select
          value={criteria.speed || ''}
          onChange={(e) => {
            const value = e.target.value ? (e.target.value as PortSpeed) : undefined;
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                speed: value
              }
            }));
          }}
        >
          <option value="">Any</option>
          {Object.values(PortSpeed).map((speed) => (
            <option key={speed} value={speed}>
              {speed}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Media Type</FormLabel>
        <Select
          value={criteria.mediaType || ''}
          onChange={(e) => {
            const value = e.target.value ? (e.target.value as MediaType) : undefined;
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                mediaType: value
              }
            }));
          }}
        >
          <option value="">Any</option>
          {Object.values(MediaType).map((media) => (
            <option key={media} value={media}>
              {media}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Connector Type</FormLabel>
        <Select
          value={criteria.connectorType || ''}
          onChange={(e) => {
            const value = e.target.value ? (e.target.value as ConnectorType) : undefined;
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                connectorType: value
              }
            }));
          }}
        >
          <option value="">Any</option>
          {Object.values(ConnectorType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Min Ports</FormLabel>
        <NumberInput
          min={0}
          value={criteria.minPorts || ''}
          onChange={(_, value) => {
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                minPorts: value
              }
            }));
          }}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <FormControl>
        <FormLabel>Max Ports</FormLabel>
        <NumberInput
          min={0}
          value={criteria.maxPorts || ''}
          onChange={(_, value) => {
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                maxPorts: value
              }
            }));
          }}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper />
            <NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
      </FormControl>

      <FormControl>
        <FormLabel>Port Name Pattern</FormLabel>
        <Input
          value={criteria.portNamePattern || ''}
          onChange={(e) => {
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                portNamePattern: e.target.value
              }
            }));
          }}
          placeholder="Regex pattern for port names"
        />
        <FormHelperText>Use regex pattern to match port names</FormHelperText>
      </FormControl>

      <FormControl display="flex" alignItems="center">
        <FormLabel mb="0">Require Unused Ports</FormLabel>
        <Switch
          isChecked={criteria.requireUnused}
          onChange={(e) => {
            setFormData(prev => ({
              ...prev,
              [`${prefix}PortCriteria`]: {
                ...prev[`${prefix}PortCriteria`],
                requireUnused: e.target.checked
              }
            }));
          }}
        />
      </FormControl>
    </VStack>
  );

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <Stack spacing={6}>
        <FormControl isRequired>
          <FormLabel>Name</FormLabel>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Connect Servers to Switch"
          />
        </FormControl>

        <FormControl>
          <FormLabel>Description</FormLabel>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the purpose of this connection rule"
          />
        </FormControl>

        {renderDeviceCriteriaFields('source', formData.sourceDeviceCriteria)}
        {renderPortCriteriaFields('source', formData.sourcePortCriteria)}
        
        <Divider />
        
        {renderDeviceCriteriaFields('target', formData.targetDeviceCriteria)}
        {renderPortCriteriaFields('target', formData.targetPortCriteria)}

        <FormControl>
          <FormLabel>AZ Scope</FormLabel>
          <Select
            value={formData.azScope}
            onChange={(e) => setFormData(prev => ({ ...prev, azScope: e.target.value as AZScope }))}
          >
            {Object.values(AZScope).map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </Select>
        </FormControl>

        {formData.azScope === AZScope.SpecificAZ && (
          <FormControl>
            <FormLabel>Target AZ ID</FormLabel>
            <Input
              value={formData.targetAZId || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAZId: e.target.value }))}
              placeholder="Enter target AZ ID"
            />
          </FormControl>
        )}

        <FormControl>
          <FormLabel>Connection Pattern</FormLabel>
          <Select
            value={formData.connectionPattern}
            onChange={(e) => setFormData(prev => ({ ...prev, connectionPattern: e.target.value as ConnectionPattern }))}
          >
            {Object.values(ConnectionPattern).map((pattern) => (
              <option key={pattern} value={pattern}>
                {pattern}
              </option>
            ))}
          </Select>
        </FormControl>

        {formData.connectionPattern === ConnectionPattern.ConnectToNTargets && (
          <FormControl>
            <FormLabel>Number of Targets</FormLabel>
            <NumberInput
              min={1}
              value={formData.numberOfTargets || 1}
              onChange={(_, value) => setFormData(prev => ({ ...prev, numberOfTargets: value }))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
        )}

        <FormControl>
          <FormLabel>Connection Strategy</FormLabel>
          <Select
            value={formData.connectionStrategy || 'all'}
            onChange={(e) => setFormData(prev => ({ ...prev, connectionStrategy: e.target.value as 'all' | 'first' | 'random' }))}
          >
            <option value="all">All Possible Connections</option>
            <option value="first">First Match Only</option>
            <option value="random">Random Match</option>
          </Select>
        </FormControl>

        <FormControl>
          <FormLabel>Max Connections</FormLabel>
          <NumberInput
            min={0}
            value={formData.maxConnections || ''}
            onChange={(_, value) => setFormData(prev => ({ ...prev, maxConnections: value }))}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormHelperText>0 means unlimited</FormHelperText>
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Bidirectional</FormLabel>
          <Switch
            isChecked={formData.bidirectional}
            onChange={(e) => setFormData(prev => ({ ...prev, bidirectional: e.target.checked }))}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Priority</FormLabel>
          <NumberInput
            min={0}
            value={formData.priority || 0}
            onChange={(_, value) => setFormData(prev => ({ ...prev, priority: value }))}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormHelperText>Higher priority rules are processed first</FormHelperText>
        </FormControl>

        <FormControl>
          <FormLabel>Tags</FormLabel>
          <HStack>
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTagAdd();
                }
              }}
            />
            <Button onClick={handleTagAdd}>Add</Button>
          </HStack>
          <HStack mt={2} wrap="wrap" spacing={2}>
            {formData.tags?.map((tag) => (
              <Tag key={tag} size="md" borderRadius="full" variant="solid" colorScheme="blue">
                <TagLabel>{tag}</TagLabel>
                <TagCloseButton onClick={() => handleTagRemove(tag)} />
              </Tag>
            ))}
          </HStack>
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel mb="0">Enabled</FormLabel>
          <Switch
            isChecked={formData.enabled}
            onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
          />
        </FormControl>

        <HStack spacing={4} justify="flex-end">
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" colorScheme="blue">
            {rule ? 'Update' : 'Create'} Rule
          </Button>
        </HStack>
      </Stack>
    </Box>
  );
}; 