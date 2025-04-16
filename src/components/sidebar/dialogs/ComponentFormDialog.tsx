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
  PortSpeed,
  DiskType,
  ConnectorType
} from '@/types/infrastructure';
import { RouterFirewallFormFields } from '../forms/RouterFirewallFormFields';
import { CablingFormFields } from '../forms/CablingFormFields';

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
  connectorType: z.nativeEnum(ConnectorType).optional()
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
      portSpeedType: formValues.portSpeedType || PortSpeed.TenG,
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
      connectorType: formValues.connectorType || ConnectorType.RJ45
    },
    values: formValues,
  });

  const { register, control } = form;

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    onSubmit();
  };

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Component Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          onTypeChange(value);
                        }}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={ComponentType.Server}>{ComponentType.Server}</SelectItem>
                          <SelectItem value={ComponentType.Switch}>{ComponentType.Switch}</SelectItem>
                          <SelectItem value={ComponentType.Router}>{ComponentType.Router}</SelectItem>
                          <SelectItem value={ComponentType.Firewall}>{ComponentType.Firewall}</SelectItem>
                          <SelectItem value={ComponentType.Disk}>{ComponentType.Disk}</SelectItem>
                          <SelectItem value={ComponentType.GPU}>{ComponentType.GPU}</SelectItem>
                          <SelectItem value="FiberPatchPanel">Fiber Patch Panel</SelectItem>
                          <SelectItem value="CopperPatchPanel">Copper Patch Panel</SelectItem>
                          <SelectItem value="Cassette">Cassette</SelectItem>
                          <SelectItem value="Cable">Cable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Component Name" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manufacturer</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Manufacturer" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
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
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Model" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
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
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Cost" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(Number(e.target.value));
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
                  name="powerRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Power Required (Watts)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Power Required" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(Number(e.target.value));
                            onInputChange(e);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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
                            <Input placeholder="CPU Model" {...field} onChange={onInputChange} />
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
                            onValueChange={field.onChange}
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
                            onValueChange={field.onChange}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={control}
                      name="switchRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Switch Role</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={SwitchRole.Management}>{SwitchRole.Management}</SelectItem>
                              <SelectItem value={SwitchRole.Leaf}>{SwitchRole.Leaf}</SelectItem>
                              <SelectItem value={SwitchRole.Spine}>{SwitchRole.Spine}</SelectItem>
                              <SelectItem value={SwitchRole.Border}>{SwitchRole.Border}</SelectItem>
                              <SelectItem value={SwitchRole.Access}>{SwitchRole.Access}</SelectItem>
                              <SelectItem value={SwitchRole.Edge}>{SwitchRole.Edge}</SelectItem>
                            </SelectContent>
                          </Select>
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
                      name="portCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port Count</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              name="portCount"
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
                      name="portSpeedType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Port Speed</FormLabel>
                          <Select 
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a speed" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value={PortSpeed.OneG}>{PortSpeed.OneG}</SelectItem>
                              <SelectItem value={PortSpeed.TenG}>{PortSpeed.TenG}</SelectItem>
                              <SelectItem value={PortSpeed.TwentyFiveG}>{PortSpeed.TwentyFiveG}</SelectItem>
                              <SelectItem value={PortSpeed.FortyG}>{PortSpeed.FortyG}</SelectItem>
                              <SelectItem value={PortSpeed.HundredG}>{PortSpeed.HundredG}</SelectItem>
                              <SelectItem value={PortSpeed.Speed400G}>{PortSpeed.Speed400G}</SelectItem>
                            </SelectContent>
                          </Select>
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
                              name="portsProvidedQuantity"
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
              
              {formValues.type === ComponentType.Router && (
                <RouterFirewallFormFields register={{ control }} />
              )}
              
              {formValues.type === ComponentType.Firewall && (
                <RouterFirewallFormFields register={{ control }} />
              )}

              {formValues.type === 'FiberPatchPanel' && (
                <CablingFormFields register={{control}} componentType="FiberPatchPanel" onInputChange={onInputChange} />
              )}

              {formValues.type === 'CopperPatchPanel' && (
                <CablingFormFields register={{control}} componentType="CopperPatchPanel" onInputChange={onInputChange} />
              )}

              {formValues.type === 'Cable' && (
                <CablingFormFields register={{control}} componentType="Cable" onInputChange={onInputChange} />
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
