import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ComponentType, 
  ServerRole, 
  DiskSlotType, 
  NetworkPortType, 
  SwitchRole,
  DiskType,
  ConnectorType
} from '@/types/infrastructure';
import { PortSpeed } from '@/types/infrastructure/port-types';
import { RouterFirewallFormFields } from '../forms/RouterFirewallFormFields';
import { CablingFormFields } from '../forms/CablingFormFields';
import { useDesignStore } from '@/store/designStore';

const formSchema = z.object({
  type: z.nativeEnum(ComponentType),
  name: z.string().min(2, {
    message: 'Component name must be at least 2 characters.',
  }),
  manufacturer: z.string().min(2, {
    message: 'Manufacturer must be at least 2 characters.',
  }),
  model: z.string().min(2, {
    message: 'Model must be at least 2 characters.',
  }),
  cost: z.number(),
  powerRequired: z.number(),
  isDefault: z.boolean(),
  // Naming fields
  namingPrefix: z.string().optional(),
  // Placement fields
  validRUStart: z.number().optional(),
  validRUEnd: z.number().optional(),
  preferredRU: z.number().optional(),
  preferredRack: z.number().optional(),
  // Server specific fields
  serverRole: z.nativeEnum(ServerRole).optional(),
  cpuModel: z.string().optional(),
  cpuCount: z.number().optional(),
  cpuSockets: z.number().optional(),
  cpuCoresPerSocket: z.number().optional(),
  memoryCapacity: z.number().optional(),
  diskSlotType: z.nativeEnum(DiskSlotType).optional(),
  diskSlotQuantity: z.number().optional(),
  ruSize: z.number().optional(),
  networkPortType: z.nativeEnum(NetworkPortType).optional(),
  portsConsumedQuantity: z.number().optional(),
  // Switch specific fields
  switchRole: z.nativeEnum(SwitchRole).optional(),
  portCount: z.number().optional(),
  portSpeed: z.string().optional(),
  portSpeedType: z.nativeEnum(PortSpeed).optional(),
  portsProvidedQuantity: z.number().optional(),
  layer: z.number().optional(),
  // Disk specific fields
  capacityTB: z.number().optional(),
  formFactor: z.string().optional(),
  interface: z.string().optional(),
  diskType: z.nativeEnum(DiskType).optional(),
  rpm: z.number().optional(),
  iops: z.number().optional(),
  readSpeed: z.number().optional(),
  writeSpeed: z.number().optional(),
  // Router/Firewall specific fields
  throughput: z.number().optional(),
  connectionPerSecond: z.number().optional(),
  concurrentConnections: z.number().optional(),
  features: z.array(z.string()).optional(),
  supportedProtocols: z.array(z.string()).optional(),
  // Cabling specific fields
  cassetteCapacity: z.number().optional(),
  portQuantity: z.number().optional(),
  length: z.number().optional(),
  portType: z.nativeEnum(ConnectorType).optional()
});

interface ComponentFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onTypeChange: (value: string) => void;
  onSwitchChange: (checked: boolean) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isEditing: boolean;
}

// NEW — import sub components for modularization
import { BasicInfoFields } from './fields/BasicInfoFields';
import { NamingSection } from './fields/NamingSection';
import { PlacementSection } from './fields/PlacementSection';
import { CostAndPowerSection } from './fields/CostAndPowerSection';

export const ComponentFormDialog: React.FC<ComponentFormDialogProps> = ({
  isOpen,
  onOpenChange,
  formValues,
  onInputChange,
  onSelectChange,
  onTypeChange,
  onSwitchChange,
  onCancel,
  onSubmit,
  isEditing
}) => {
  const physicalConstraints = useDesignStore((state) => 
    state.activeDesign?.requirements?.physicalConstraints);
  const maxRackUnits = physicalConstraints?.rackUnitsPerRack || 42;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: formValues.type || ComponentType.Server,
      name: formValues.name || '',
      manufacturer: formValues.manufacturer || '',
      model: formValues.model || '',
      cost: formValues.cost || 0,
      powerRequired: formValues.powerRequired || 0,
      isDefault: formValues.isDefault || false,
      namingPrefix: formValues.namingPrefix || '',
      validRUStart: formValues.placement?.validRUStart || 1,
      validRUEnd: formValues.placement?.validRUEnd || maxRackUnits,
      preferredRU: formValues.placement?.preferredRU || 1,
      preferredRack: formValues.placement?.preferredRack || 1,
      serverRole: formValues.serverRole || ServerRole.Compute,
      cpuModel: formValues.cpuModel || '',
      cpuCount: formValues.cpuCount || 1,
      cpuSockets: formValues.cpuSockets || 1,
      cpuCoresPerSocket: formValues.cpuCoresPerSocket || 4,
      memoryCapacity: formValues.memoryCapacity || 0,
      diskSlotType: formValues.diskSlotType || DiskSlotType.TwoPointFive,
      diskSlotQuantity: formValues.diskSlotQuantity || 8,
      ruSize: formValues.ruSize || 1,
      networkPortType: formValues.networkPortType || NetworkPortType.SFP,
      portsConsumedQuantity: formValues.portsConsumedQuantity || 2,
      switchRole: formValues.switchRole || SwitchRole.Access,
      portCount: formValues.portCount || 24,
      portSpeed: formValues.portSpeed || '10',
      portSpeedType: formValues.portSpeedType || PortSpeed.Speed10G,
      portsProvidedQuantity: formValues.portsProvidedQuantity || 24,
      layer: formValues.layer || 3,
      capacityTB: formValues.capacityTB || 1,
      formFactor: formValues.formFactor || '2.5"',
      interface: formValues.interface || 'SATA',
      diskType: formValues.diskType || DiskType.SATASSD,
      rpm: formValues.rpm || 7200,
      iops: formValues.iops || 10000,
      readSpeed: formValues.readSpeed || 1000,
      writeSpeed: formValues.writeSpeed || 1000,
      throughput: formValues.throughput || 10,
      connectionPerSecond: formValues.connectionPerSecond || 10000,
      concurrentConnections: formValues.concurrentConnections || 100000,
      features: formValues.features || [],
      supportedProtocols: formValues.supportedProtocols || [],
      cassetteCapacity: formValues.cassetteCapacity || 12,
      portQuantity: formValues.portQuantity || 24,
      length: formValues.length || 3,
      portType: formValues.portType || ConnectorType.RJ45
    },
    values: formValues,
  });

  const getDefaultPrefix = (type: string) => {
    switch(type) {
      case ComponentType.Server: return 'SRV';
      case ComponentType.Switch: return 'SW';
      case ComponentType.Router: return 'RTR';
      case ComponentType.Firewall: return 'FW';
      case ComponentType.Disk: return 'DSK';
      case ComponentType.GPU: return 'GPU';
      case ComponentType.FiberPatchPanel: return 'FPP';
      case ComponentType.CopperPatchPanel: return 'CPP';
      case ComponentType.Cassette: return 'CAS';
      case ComponentType.Cable: return 'CBL';
      default: return type.substring(0, 3).toUpperCase();
    }
  };

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    onSubmit();
  };

  const { control } = form;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{isEditing ? 'Edit Component' : 'Add Component'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Edit an existing component in the library' : 'Add a new component to the library'}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-8rem)] px-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
              {/* Basic Component Information Section */}
              <BasicInfoFields
                control={control}
                formValues={formValues}
                onInputChange={onInputChange}
                onSelectChange={onSelectChange}
                onTypeChange={onTypeChange}
              />

              {/* Set as Default */}
              <FormField
                control={control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm">Set as Default</FormLabel>
                      <FormDescription>
                        Default for its type
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          onSwitchChange(checked);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Naming Section */}
              <NamingSection
                control={control}
                formValues={formValues}
                onInputChange={onInputChange}
                getDefaultPrefix={getDefaultPrefix}
              />

              {/* Placement Section */}
              <PlacementSection
                control={control}
                formValues={formValues}
                onInputChange={onInputChange}
                maxRackUnits={maxRackUnits}
                ComponentType={ComponentType}
              />

              {/* Cost and Power — always visible for all except cabling/patch/cassette */}
              <CostAndPowerSection
                control={control}
                formValues={formValues}
                onInputChange={onInputChange}
              />

              {formValues.type === ComponentType.Server && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={control}
                      name="serverRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Server Role</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              onSelectChange('serverRole', value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={ServerRole.Compute}>{ServerRole.Compute}</SelectItem>
                              <SelectItem value={ServerRole.GPU}>{ServerRole.GPU}</SelectItem>
                              <SelectItem value={ServerRole.Storage}>{ServerRole.Storage}</SelectItem>
                              <SelectItem value={ServerRole.Controller}>{ServerRole.Controller}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="ruSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rack Units (RU)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              name="ruSize"
                              onChange={e => {
                                const value = Number(e.target.value) || 0;
                                field.onChange(value);
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="cpuModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPU Model</FormLabel>
                          <FormControl>
                            <Input placeholder="CPU Model" {...field} onChange={(e) => {
                              field.onChange(e);
                              onInputChange(e);
                            }} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={control}
                      name="cpuCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPU Count</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              name="cpuCount"
                              onChange={e => {
                                const value = Number(e.target.value) || 0;
                                field.onChange(value);
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="cpuSockets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPU Sockets</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              name="cpuSockets"
                              onChange={e => {
                                const value = Number(e.target.value) || 0;
                                field.onChange(value);
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="cpuCoresPerSocket"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPU Cores Per Socket</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              name="cpuCoresPerSocket"
                              onChange={e => {
                                const value = Number(e.target.value) || 0;
                                field.onChange(value);
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={control}
                      name="memoryCapacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Memory Capacity (GB)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              name="memoryCapacity"
                              onChange={e => {
                                const value = Number(e.target.value) || 0;
                                field.onChange(value);
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="diskSlotType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Disk Slot Type</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              onSelectChange('diskSlotType', value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a slot type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={DiskSlotType.TwoPointFive}>{DiskSlotType.TwoPointFive}</SelectItem>
                              <SelectItem value={DiskSlotType.ThreePointFive}>{DiskSlotType.ThreePointFive}</SelectItem>
                              <SelectItem value={DiskSlotType.NVMe}>{DiskSlotType.NVMe}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="diskSlotQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Disk Slot Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              name="diskSlotQuantity"
                              onChange={e => {
                                const value = Number(e.target.value) || 0;
                                field.onChange(value);
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="networkPortType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Network Port Type</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              onSelectChange('networkPortType', value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a port type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={NetworkPortType.SFP}>{NetworkPortType.SFP}</SelectItem>
                              <SelectItem value={NetworkPortType.QSFP}>{NetworkPortType.QSFP}</SelectItem>
                              <SelectItem value={NetworkPortType.RJ45}>{NetworkPortType.RJ45}</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="portsConsumedQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ports Consumed Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              name="portsConsumedQuantity"
                              onChange={e => {
                                const value = Number(e.target.value) || 0;
                                field.onChange(value);
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
              
              {formValues.type === ComponentType.Switch && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={control}
                      name="switchRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Switch Role</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              onSelectChange('switchRole', value);
                            }}
                            defaultValue={field.value}
                            value={field.value ?? SwitchRole.Access}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(SwitchRole).map((role) => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="layer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Layer</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="2 or 3"
                              {...field}
                              value={field.value ?? ''}
                              onChange={e => {
                                const val = e.target.value;
                                field.onChange(val === '' ? null : Number(val));
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="ruSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rack Units (RU)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value ?? ''} 
                              onChange={e => {
                                const val = e.target.value;
                                field.onChange(val === '' ? 0 : Number(val)); 
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="portCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port Count</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value ?? ''} 
                              onChange={e => {
                                const val = e.target.value;
                                field.onChange(val === '' ? 0 : Number(val));
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={control}
                      name="portSpeedType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port Speed</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              onSelectChange('portSpeedType', value);
                            }}
                            defaultValue={field.value}
                            value={field.value ?? PortSpeed.Speed10G}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a speed" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.values(PortSpeed).map((speed) => (
                                <SelectItem key={speed} value={speed}>{speed}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={control}
                      name="portsProvidedQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ports Provided Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              value={field.value ?? ''} 
                              onChange={e => {
                                const val = e.target.value;
                                field.onChange(val === '' ? 0 : Number(val));
                                onInputChange(e);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
              
              {formValues.type === ComponentType.Router && (
                <RouterFirewallFormFields register={{ control }} />
              )}
              
              {formValues.type === ComponentType.Firewall && (
                <RouterFirewallFormFields register={{ control }} />
              )}

              {formValues.type === 'FiberPatchPanel' && (
                <CablingFormFields register={{control}} componentType="FiberPatchPanel" onInputChange={onInputChange} onSelectChange={onSelectChange} />
              )}

              {formValues.type === 'CopperPatchPanel' && (
                <CablingFormFields register={{control}} componentType="CopperPatchPanel" onInputChange={onInputChange} onSelectChange={onSelectChange} />
              )}

              {formValues.type === 'Cable' && (
                <CablingFormFields register={{control}} componentType="Cable" onInputChange={onInputChange} onSelectChange={onSelectChange} />
              )}

              {/* Add rendering for Cassette type */}
              {formValues.type === 'Cassette' && (
                <CablingFormFields register={{control}} componentType="Cassette" onInputChange={onInputChange} onSelectChange={onSelectChange} />
              )}
            </form>
          </Form>
        </ScrollArea>
        
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" onClick={onSubmit}>{isEditing ? 'Update' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
