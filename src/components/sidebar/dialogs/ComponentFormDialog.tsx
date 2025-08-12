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
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ComponentType, 
  ServerRole, 
  DiskSlotType, 
  NetworkPortType,
  MemoryType,
  SwitchRole,
  DiskType,
  ConnectorType,
  CableMediaType
} from '@/types/infrastructure';
import { PortSpeed, MediaType } from '@/types/infrastructure/port-types';
import { useDesignStore } from '@/store/designStore';

// Import validation schema
import { legacyFormSchema } from './forms/component-forms/ComponentValidationSchemas';

// Import factory and port management
import { ComponentFormFactory } from './forms/component-forms/ComponentFormFactory';
import { PortManagementSection } from './forms/component-forms/PortManagementSection';

// Schema is now imported from ComponentValidationSchemas.ts
const formSchema = legacyFormSchema;

interface ComponentFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formValues: Record<string, unknown>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onTypeChange: (value: string) => void;
  onSwitchChange: (checked: boolean) => void;
  onCancel: () => void;
  onSubmit: (data: z.infer<typeof legacyFormSchema>) => void;
  isEditing: boolean;
  addPort: () => void;
  removePort: (index: number) => void;
  updatePort: (index: number, field: keyof import('@/types/infrastructure/port-types').Port, value: unknown) => void;
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
  isEditing,
  addPort,
  removePort,
  updatePort
}) => {
  // --- ADDED LOG --- 
  console.log('[ComponentFormDialog] Render/Re-render', { 
    isOpen, 
    isEditing, 
    formValuesType: formValues?.type,
    // Avoid logging full formValues here to prevent excessive console noise if it's large,
    // but you can log specific problematic fields if needed.
    // formValues
  });

  const physicalConstraints = useDesignStore((state) => 
    state.activeDesign?.requirements?.physicalConstraints);
  const maxRackUnits = physicalConstraints?.rackUnitsPerRack || 42;

  const form = useForm<z.infer<typeof legacyFormSchema>>({
    resolver: zodResolver(legacyFormSchema),
    defaultValues: {
      type: (formValues.type as ComponentType) || ComponentType.Server,
      name: (formValues.name as string) || '',
      manufacturer: (formValues.manufacturer as string) || '',
      model: (formValues.model as string) || '',
      cost: (formValues.cost as number) || 0,
      powerIdle: (formValues.powerIdle as number) || 0,
      powerTypical: (formValues.powerTypical as number) || 0,
      powerPeak: (formValues.powerPeak as number) || 0,
      isDefault: (formValues.isDefault as boolean) || false,
      namingPrefix: (formValues.namingPrefix as string) || '',
      validRUStart: (formValues.placement as { validRUStart?: number; validRUEnd?: number; preferredRU?: number })?.validRUStart || 1,
      validRUEnd: (formValues.placement as { validRUStart?: number; validRUEnd?: number; preferredRU?: number })?.validRUEnd || maxRackUnits,
      preferredRU: (formValues.placement as { validRUStart?: number; validRUEnd?: number; preferredRU?: number })?.preferredRU || 1,
      // preferredRack: formValues.placement?.preferredRack || 1, // Removed
      serverRole: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.serverRole as ServerRole) || ServerRole.Compute) : undefined,
      cpuModel: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.cpuModel as string) || '') : undefined,
      cpuSockets: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.cpuSockets as number) || 1) : undefined,
      cpuCoresPerSocket: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.cpuCoresPerSocket as number) || 4) : undefined,
      memoryCapacity: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.memoryCapacity as number) || 0) : undefined,
      diskSlotType: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.diskSlotType as DiskSlotType) || DiskSlotType.TwoPointFive) : undefined,
      diskSlotQuantity: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.diskSlotQuantity as number) || 8) : undefined,
      ruSize: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.ruSize as number) || 1) : undefined,
      networkPortType: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.networkPortType as NetworkPortType) || NetworkPortType.SFP) : undefined,
      portsConsumedQuantity: (formValues.type as ComponentType) === ComponentType.Server ? ((formValues.portsConsumedQuantity as number) || 2) : undefined,
      // New CPU fields
      cpuTdpWatts: (formValues.type as ComponentType) === ComponentType.Server ? (formValues.cpuTdpWatts as number) : undefined,
      cpuFrequencyBaseGhz: (formValues.type as ComponentType) === ComponentType.Server ? (formValues.cpuFrequencyBaseGhz as number) : undefined,
      cpuFrequencyTurboGhz: (formValues.type as ComponentType) === ComponentType.Server ? (formValues.cpuFrequencyTurboGhz as number) : undefined,
      // New Memory fields
      memoryType: (formValues.type as ComponentType) === ComponentType.Server ? (formValues.memoryType as MemoryType) : undefined,
      memoryDimmSlotCapacity: (formValues.type as ComponentType) === ComponentType.Server ? (formValues.memoryDimmSlotCapacity as number) : undefined,
      memoryDimmSlotsConsumed: (formValues.type as ComponentType) === ComponentType.Server ? (formValues.memoryDimmSlotsConsumed as number) : undefined,
      memoryDimmSize: (formValues.type as ComponentType) === ComponentType.Server ? (formValues.memoryDimmSize as number) : undefined,
      memoryDimmFrequencyMhz: (formValues.type as ComponentType) === ComponentType.Server ? (formValues.memoryDimmFrequencyMhz as number) : undefined,
      // PCIe slots
      pcieSlots: (formValues.type as ComponentType) === ComponentType.Server ? (formValues.pcieSlots as Array<{ quantity?: number; formFactor?: PCIeFormFactor }>) : undefined,
      switchRole: (formValues.type as ComponentType) === ComponentType.Switch ? ((formValues.switchRole as SwitchRole) || SwitchRole.Access) : undefined,
      // portCount: formValues.portCount || 24, // Commented out
      // portSpeed: formValues.portSpeed || '10', // Commented out
      portSpeedType: (formValues.type as ComponentType) === ComponentType.Switch ? ((formValues.portSpeedType as PortSpeed) || PortSpeed.Speed10G) : undefined,
      portsProvidedQuantity: (formValues.type as ComponentType) === ComponentType.Switch ? ((formValues.portsProvidedQuantity as number) || 24) : undefined,
      // layer: formValues.layer || 3, // Commented out
      capacityTB: (formValues.type as ComponentType) === ComponentType.Disk ? ((formValues.capacityTB as number) || 1) : undefined,
      formFactor: (formValues.type as ComponentType) === ComponentType.Disk ? ((formValues.formFactor as string) || '2.5"') : undefined,
      interface: (formValues.type as ComponentType) === ComponentType.Disk ? ((formValues.interface as string) || 'SATA') : undefined,
      diskType: (formValues.type as ComponentType) === ComponentType.Disk ? ((formValues.diskType as DiskType) || DiskType.SATASSD) : undefined,
      rpm: (formValues.type as ComponentType) === ComponentType.Disk ? ((formValues.rpm as number) || 7200) : undefined,
      iops: (formValues.type as ComponentType) === ComponentType.Disk ? ((formValues.iops as number) || 10000) : undefined,
      readSpeed: formValues.type === ComponentType.Disk ? (formValues.readSpeed || 1000) : undefined,
      writeSpeed: formValues.type === ComponentType.Disk ? (formValues.writeSpeed || 1000) : undefined,
      throughput: (formValues.type === ComponentType.Router || formValues.type === ComponentType.Firewall) ? (formValues.throughput || 10) : undefined,
      connectionPerSecond: (formValues.type === ComponentType.Router || formValues.type === ComponentType.Firewall) ? (formValues.connectionPerSecond || 10000) : undefined,
      concurrentConnections: (formValues.type === ComponentType.Router || formValues.type === ComponentType.Firewall) ? (formValues.concurrentConnections || 100000) : undefined,
      features: (formValues.type === ComponentType.Router || formValues.type === ComponentType.Firewall) ? (formValues.features || []) : undefined,
      supportedProtocols: (formValues.type === ComponentType.Router || formValues.type === ComponentType.Firewall) ? (formValues.supportedProtocols || []) : undefined,
      cassetteCapacity: (formValues.type === ComponentType.FiberPatchPanel) ? (formValues.cassetteCapacity || 12) : undefined,
      portQuantity: (formValues.type === ComponentType.FiberPatchPanel) ? (formValues.portQuantity || 24) : undefined,
      length: formValues.type === ComponentType.Cable ? (formValues.length || 3) : undefined,
      portType: (formValues.type === ComponentType.Cassette) ? (formValues.portType || ConnectorType.LC) : undefined,
      // New cassette fields
      frontPortType: (formValues.type === ComponentType.Cassette || formValues.type === ComponentType.CopperPatchPanel) ? 
        (formValues.frontPortType || (formValues.type === ComponentType.Cassette ? ConnectorType.LC : ConnectorType.RJ45)) : undefined,
      frontPortQuantity: (formValues.type === ComponentType.Cassette || formValues.type === ComponentType.CopperPatchPanel) ? 
        (formValues.frontPortQuantity || (formValues.type === ComponentType.Cassette ? 12 : 24)) : undefined,
      backPortType: (formValues.type === ComponentType.Cassette || formValues.type === ComponentType.CopperPatchPanel) ? 
        (formValues.backPortType || (formValues.type === ComponentType.Cassette ? ConnectorType.MPO12 : ConnectorType.RJ45)) : undefined,
      backPortQuantity: (formValues.type === ComponentType.Cassette || formValues.type === ComponentType.CopperPatchPanel) ? 
        (formValues.backPortQuantity || (formValues.type === ComponentType.Cassette ? 1 : 24)) : undefined,
      // Cable specific defaults
      connectorA_Type: formValues.type === ComponentType.Cable ? (formValues.connectorA_Type || ConnectorType.RJ45) : undefined,
      connectorB_Type: formValues.type === ComponentType.Cable ? (formValues.connectorB_Type || ConnectorType.RJ45) : undefined,
      mediaType: formValues.type === ComponentType.Cable ? (formValues.mediaType || CableMediaType.CopperCat6a) : undefined,
      cableSpeed: formValues.type === ComponentType.Cable ? formValues.cableSpeed : undefined,
      // Transceiver specific defaults - using direct field names from Transceiver interface
      mediaTypeSupported: formValues.mediaTypeSupported || [],
      // For Transceiver, 'connectorType' is its port-side connector, 'speed' is its speed.
      // These will be conditionally relevant based on formValues.type when form loads.
      // Ensure these don't clash with *other* components' 'connectorType' or 'speed' if formValues is flat.
      // The schema has these as distinct now (e.g. cassette 'portType', switch 'portSpeedType').
      connectorType: formValues.type === ComponentType.Transceiver ? (formValues.connectorType || ConnectorType.SFP) : (formValues.portType || ConnectorType.RJ45),
      mediaConnectorType: formValues.mediaConnectorType || ConnectorType.LC,
      speed: formValues.type === ComponentType.Transceiver ? (formValues.speed || PortSpeed.Speed10G) : (formValues.portSpeedType || PortSpeed.Speed10G),
      maxDistanceMeters: formValues.maxDistanceMeters || 0,
      breakoutCompatible: formValues.breakoutCompatible || false,
      isBreakout: formValues.isBreakout || false,
      connectorB_Quantity: formValues.connectorB_Quantity || 4
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

  const handleFormSubmit = (data: z.infer<typeof legacyFormSchema>) => {
    // --- ADDED LOG --- 
    console.log('[ComponentFormDialog] handleFormSubmit (onValid) called with data:', data);
    onSubmit(data);
  };

  // --- ADDED LOG HANDLER ---
  const handleFormErrors = (errors: Record<string, unknown>) => {
    console.error('[ComponentFormDialog] Form validation failed (onInvalid):', errors);
    // You can add more specific error handling or user notification here if needed
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
            <form onSubmit={form.handleSubmit(handleFormSubmit, handleFormErrors)} id="component-form" className="space-y-4 py-4">
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

              {/* Placement Section - Not for Transceivers, Cables, Disks, GPUs, or Cassettes */}
              {formValues.type !== ComponentType.Transceiver && 
               formValues.type !== ComponentType.Cable &&
               formValues.type !== ComponentType.Disk &&
               formValues.type !== ComponentType.GPU &&
               formValues.type !== ComponentType.Cassette && (
                <PlacementSection
                  control={control}
                  formValues={formValues}
                  onInputChange={onInputChange}
                  maxRackUnits={maxRackUnits}
                  ComponentType={ComponentType}
                />
              )}

              {/* Cost and Power Section */}
              <CostAndPowerSection
                control={control}
                formValues={formValues}
                onInputChange={onInputChange}
              />

              {/* Component-specific fields rendered by factory */}
              <ComponentFormFactory
                control={control}
                componentType={formValues.type}
                formValues={formValues}
                onInputChange={onInputChange}
                onSelectChange={onSelectChange}
              />

              {/* Port Management Section */}
              <PortManagementSection
                componentType={formValues.type}
                formValues={formValues}
                addPort={addPort}
                removePort={removePort}
                updatePort={updatePort}
                onInputChange={onInputChange}
              />

            </form>
          </Form>
        </ScrollArea>
        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" form="component-form">{isEditing ? 'Update' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};