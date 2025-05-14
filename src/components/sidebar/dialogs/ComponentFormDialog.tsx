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

// NEW FIELDS
import { ServerFields } from "./fields/ServerFields";
import { SwitchFields } from "./fields/SwitchFields";
import { RouterFirewallFields } from "./fields/RouterFirewallFields";
import { CablingFields } from "./fields/CablingFields";

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
          <DialogTitle>{isEditing ? "Edit Component" : "Add Component"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit an existing component in the library" : "Add a new component to the library"}
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

              {/* Cost and Power Section */}
              <CostAndPowerSection
                control={control}
                formValues={formValues}
                onInputChange={onInputChange}
              />

              {/* Server fields */}
              {formValues.type === ComponentType.Server && (
                <ServerFields
                  control={control}
                  formValues={formValues}
                  onInputChange={onInputChange}
                  onSelectChange={onSelectChange}
                />
              )}

              {/* Switch fields */}
              {formValues.type === ComponentType.Switch && (
                <SwitchFields
                  control={control}
                  formValues={formValues}
                  onInputChange={onInputChange}
                  onSelectChange={onSelectChange}
                />
              )}

              {/* Router/Firewall fields */}
              {(formValues.type === ComponentType.Router || formValues.type === ComponentType.Firewall) && (
                <RouterFirewallFields control={control} />
              )}

              {/* Cabling/Panel/Cassette fields */}
              {(formValues.type === "FiberPatchPanel" ||
                formValues.type === "CopperPatchPanel" ||
                formValues.type === "Cassette" ||
                formValues.type === "Cable") && (
                <CablingFields
                  control={control}
                  componentType={formValues.type}
                  onInputChange={onInputChange}
                  onSelectChange={onSelectChange}
                />
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
