
import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ComponentType, ConnectorType } from '@/types/infrastructure';
import { 
  AZScope, 
  ConnectionPattern, 
  ConnectionRule,
  DeviceCriteria,
  PortCriteria 
} from '@/types/infrastructure/connection-rule-types';
import { PortRole, PortSpeed, MediaType } from '@/types/infrastructure/port-types';
import { DeviceRoleType } from '@/types/infrastructure/requirements-types';
import { useDesignStore } from '@/store/designStore';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

// Schema for form validation
const connectionRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  sourceDeviceCriteria: z.object({
    componentType: z.nativeEnum(ComponentType).optional(),
    role: z.string().optional()
  }),
  sourcePortCriteria: z.object({
    portRole: z.array(z.nativeEnum(PortRole)).optional(),
    connectorType: z.nativeEnum(ConnectorType).optional(),
    speed: z.nativeEnum(PortSpeed).optional(),
    mediaType: z.nativeEnum(MediaType).optional(),
    quantityRequired: z.number().int().min(1).optional()
  }),
  targetDeviceCriteria: z.object({
    componentType: z.nativeEnum(ComponentType).optional(),
    role: z.string().optional()
  }),
  targetPortCriteria: z.object({
    portRole: z.array(z.nativeEnum(PortRole)).optional(),
    connectorType: z.nativeEnum(ConnectorType).optional(),
    speed: z.nativeEnum(PortSpeed).optional(),
    mediaType: z.nativeEnum(MediaType).optional(),
    quantityRequired: z.number().int().min(1).optional()
  }),
  azScope: z.nativeEnum(AZScope),
  targetAZId: z.string().optional(),
  connectionPattern: z.nativeEnum(ConnectionPattern),
  numberOfTargets: z.number().int().min(1).optional(),
  cableId: z.string().optional(),
  enabled: z.boolean().default(true),
  id: z.string().optional()
});

type ConnectionRuleFormValues = z.infer<typeof connectionRuleSchema>;

interface ConnectionRuleFormProps {
  initialValues: ConnectionRule | null;
  onSave: (data: ConnectionRule) => void;
  onCancel: () => void;
}

export const ConnectionRuleForm: React.FC<ConnectionRuleFormProps> = ({
  initialValues,
  onSave,
  onCancel
}) => {
  const { activeDesign } = useDesignStore();
  
  // Get options from the active design
  const componentTypes = Object.values(ComponentType);
  const deviceRoles = Object.values(DeviceRoleType);
  const customRoles = activeDesign?.componentRoles?.map(role => role.id) || [];
  const availableAZs = activeDesign?.requirements.physicalConstraints.availabilityZones || [];
  const availableCables = activeDesign?.components.filter(c => c.type === ComponentType.Cable) || [];
  
  // Initialize form with default or existing values
  const defaultValues: ConnectionRuleFormValues = initialValues || {
    name: '',
    description: '',
    sourceDeviceCriteria: {},
    sourcePortCriteria: {},
    targetDeviceCriteria: {},
    targetPortCriteria: {},
    azScope: AZScope.AnyAZ,
    connectionPattern: ConnectionPattern.ConnectToEachTarget,
    enabled: true
  };

  const form = useForm<ConnectionRuleFormValues>({
    resolver: zodResolver(connectionRuleSchema),
    defaultValues
  });
  
  const watchAzScope = form.watch('azScope');
  const watchConnectionPattern = form.watch('connectionPattern');
  
  const onSubmit = (data: ConnectionRuleFormValues) => {
    onSave(data as ConnectionRule);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rule Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter rule name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-x-2 rounded-md border p-4">
                <div className="space-y-0.5">
                  <FormLabel>Enabled</FormLabel>
                  <FormDescription>
                    Whether this rule is active
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe the purpose of this rule"
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Source Device Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
          <h3 className="col-span-2 text-lg font-medium">Source Device Criteria</h3>
          
          <FormField
            control={form.control}
            name="sourceDeviceCriteria.componentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Component Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select component type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem key="any-component-type-source" value="_any">Any</SelectItem>
                    {componentTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="sourceDeviceCriteria.role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device Role</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem key="any-role-source" value="_any">Any</SelectItem>
                    {deviceRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                    {customRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role} (custom)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Target Device Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
          <h3 className="col-span-2 text-lg font-medium">Target Device Criteria</h3>
          
          <FormField
            control={form.control}
            name="targetDeviceCriteria.componentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Component Type</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select component type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem key="any-component-type-target" value="_any">Any</SelectItem>
                    {componentTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="targetDeviceCriteria.role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device Role</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem key="any-role-target" value="_any">Any</SelectItem>
                    {deviceRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                    {customRoles.map(role => (
                      <SelectItem key={role} value={role}>
                        {role} (custom)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Connection Scope */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
          <h3 className="col-span-2 text-lg font-medium">Connection Scope</h3>
          
          <FormField
            control={form.control}
            name="azScope"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Availability Zone Scope</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(AZScope).map(scope => (
                      <SelectItem key={scope} value={scope}>
                        {scope}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  How to match devices across availability zones
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {watchAzScope === AZScope.SpecificAZ && (
            <FormField
              control={form.control}
              name="targetAZId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target AZ</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    value={field.value || '_no_az_selected'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target AZ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableAZs.length === 0 ? (
                        <SelectItem key="no-az-available" value="_no_az_available">No AZs available</SelectItem>
                      ) : (
                        availableAZs.map(az => (
                          <SelectItem key={`az-${az.id}`} value={az.id}>
                            {az.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="connectionPattern"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Pattern</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(ConnectionPattern).map(pattern => (
                      <SelectItem key={pattern} value={pattern}>
                        {pattern === ConnectionPattern.ConnectToEachTarget 
                          ? 'Connect to each target' 
                          : 'Connect to N targets'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  How many target devices to connect to
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {watchConnectionPattern === ConnectionPattern.ConnectToNTargets && (
            <FormField
              control={form.control}
              name="numberOfTargets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Targets</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      value={field.value || 1}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="cableId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Cable Type (Optional)</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value || '_no_cable'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a cable type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem key="no-cable" value="_no_cable">None</SelectItem>
                    {availableCables.map(cable => (
                      <SelectItem key={cable.id} value={cable.id}>
                        {cable.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Cable type to use for these connections
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">
            {initialValues ? "Update Rule" : "Create Rule"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

