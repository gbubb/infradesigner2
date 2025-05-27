import React, { useState } from 'react';
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
  ConnectorType,
  TransceiverModel,
  CableMediaType
} from '@/types/infrastructure';
import { PortSpeed, PortRole, MediaType } from '@/types/infrastructure/port-types';
import { RouterFirewallFormFields } from '../forms/RouterFirewallFormFields';
import { CablingFormFields } from '../forms/CablingFormFields';
import { useDesignStore } from '@/store/designStore';

// NEW FIELDS
import { ServerFields } from "./fields/ServerFields";
import { SwitchFields } from "./fields/SwitchFields";
import { RouterFirewallFields } from "./fields/RouterFirewallFields";
import { CablingFields } from "./fields/CablingFields";
import { OpticsFields } from "./fields/OpticsFields";

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
  portType: z.nativeEnum(ConnectorType).optional(),
  // Cable specific fields
  connectorA_Type: z.nativeEnum(ConnectorType).optional(),
  connectorB_Type: z.nativeEnum(ConnectorType).optional(),
  mediaType: z.nativeEnum(CableMediaType).optional(),
  cableSpeed: z.nativeEnum(PortSpeed).optional(),
  // Transceiver specific fields
  transceiverModel: z.nativeEnum(TransceiverModel).optional(),
  mediaTypeSupported: z.array(z.nativeEnum(MediaType)).optional(),
  transceiverConnectorType: z.nativeEnum(ConnectorType).optional(),
  mediaConnectorType: z.nativeEnum(ConnectorType).optional(),
  transceiverSpeed: z.nativeEnum(PortSpeed).optional(),
  maxDistanceMeters: z.number().optional()
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
  addPort: () => void;
  removePort: (index: number) => void;
  updatePort: (index: number, field: keyof import('@/types/infrastructure/port-types').Port, value: any) => void;
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
  const physicalConstraints = useDesignStore((state) => 
    state.activeDesign?.requirements?.physicalConstraints);
  const maxRackUnits = physicalConstraints?.rackUnitsPerRack || 42;

  // Add interface types and form factors
  const interfaceTypes = ["SATA", "SAS", "NVMe", "PCIe"];
  const formFactors = ['2.5"', '3.5"', 'M.2', 'U.2', 'E1.S', 'E1.L'];

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
      portType: formValues.portType || ConnectorType.RJ45,
      // Cable specific defaults
      connectorA_Type: formValues.connectorA_Type || ConnectorType.RJ45,
      connectorB_Type: formValues.connectorB_Type || ConnectorType.RJ45,
      mediaType: formValues.mediaType || CableMediaType.CopperCat6a,
      cableSpeed: formValues.cableSpeed || undefined,
      // Transceiver specific defaults
      transceiverModel: formValues.transceiverModel || undefined,
      mediaTypeSupported: formValues.mediaTypeSupported || [],
      transceiverConnectorType: formValues.transceiverConnectorType || ConnectorType.SFP,
      mediaConnectorType: formValues.mediaConnectorType || ConnectorType.LC,
      transceiverSpeed: formValues.transceiverSpeed || PortSpeed.Speed10G,
      maxDistanceMeters: formValues.maxDistanceMeters || 0
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

  // --- BULK PORT ADDITION UI/LOGIC ---
  const [bulkPort, setBulkPort] = useState({
    prefix: "",
    role: "",
    speed: "",
    connectorType: "",
    quantity: 1,
  });

  const handleBulkPortChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setBulkPort((prev) => ({
      ...prev,
      [name]: name === "quantity" ? Number(value) : value,
    }));
  };

  const handleBulkAddPorts = () => {
    const { prefix, role, speed, connectorType, quantity } = bulkPort;
    if (!prefix || !speed || !connectorType || !quantity || quantity < 1) {
      alert("Please fill all fields for bulk port creation and use quantity >= 1.");
      return;
    }
    const startNum = (formValues.ports?.length || 0) + 1;
    const portsToAdd = Array.from({ length: quantity }).map((_, i) => ({
      id: crypto.randomUUID(),
      name: `${prefix}${startNum + i}`,
      role: role || undefined,
      speed,
      connectorType,
    }));
    // Append new ports to current list
    if (portsToAdd.length > 0) {
      let updatedPorts = [...(formValues.ports || []), ...portsToAdd];
      onInputChange({
        target: {
          name: "ports",
          value: updatedPorts,
        },
      } as any);
    }
    setBulkPort((prev) => ({ ...prev, quantity: 1 }));
  };

  const handlePortChange = (index: number, field: keyof import('@/types/infrastructure/port-types').Port, value: any) => {
    updatePort(index, field, value);
  };

  // Type check for cable; if it's a cable, hide all port UI
  const isCable = formValues.type === "Cable";

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

              {/* Placement Section - Not for Transceivers */}
              {formValues.type !== ComponentType.Transceiver && (
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

              {/* Optics/Transceiver fields */}
              {formValues.type === ComponentType.Transceiver && (
                <OpticsFields control={control} />
              )}

              {/* Disk fields */}
              {formValues.type === ComponentType.Disk && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FormLabel htmlFor="capacityTB">Capacity (TB)</FormLabel>
                      <Input
                        id="capacityTB"
                        name="capacityTB"
                        type="number"
                        value={formValues.capacityTB || 0}
                        onChange={onInputChange}
                        placeholder="e.g. 8"
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <FormLabel htmlFor="diskType">Disk Type</FormLabel>
                      <select
                        id="diskType"
                        name="diskType"
                        className="border rounded px-3 py-2 w-full"
                        value={formValues.diskType ?? ''}
                        onChange={(e) => onSelectChange("diskType", e.target.value)}
                      >
                        <option value="">Select Type</option>
                        {Object.values(DiskType).map(dt => (
                          <option value={dt} key={dt}>{dt}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <FormLabel htmlFor="interface">Interface Type</FormLabel>
                      <select
                        id="interface"
                        name="interface"
                        className="border rounded px-3 py-2 w-full"
                        value={formValues.interface ?? ''}
                        onChange={(e) => onSelectChange("interface", e.target.value)}
                      >
                        <option value="">Select Interface</option>
                        {interfaceTypes.map((iface) => (
                          <option value={iface} key={iface}>{iface}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <FormLabel htmlFor="formFactor">Form Factor</FormLabel>
                      <select
                        id="formFactor"
                        name="formFactor"
                        className="border rounded px-3 py-2 w-full"
                        value={formValues.formFactor ?? ''}
                        onChange={(e) => onSelectChange("formFactor", e.target.value)}
                      >
                        <option value="">Select Form Factor</option>
                        {formFactors.map(ff => (
                          <option value={ff} key={ff}>{ff}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- BULK PORTS SECTION - Not for Transceivers or Cables ---- */}
              {formValues.type !== ComponentType.Transceiver && !isCable && (
                <div className="mb-4 border p-3 rounded-lg">
                  <div className="font-semibold mb-1">Add Multiple Ports</div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                    <div>
                      <label className="block text-xs font-medium mb-1" htmlFor="prefix">Prefix</label>
                      <input
                        type="text"
                        name="prefix"
                        id="bulk-port-prefix"
                        value={bulkPort.prefix}
                        onChange={handleBulkPortChange}
                        placeholder="eth"
                        className="border px-2 py-1 rounded w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" htmlFor="role">Role</label>
                      <select
                        name="role"
                        value={bulkPort.role}
                        onChange={handleBulkPortChange}
                        className="border px-2 py-1 rounded w-full"
                      >
                        <option value="">--</option>
                        {Object.values(PortRole).map(r => (
                          <option value={r} key={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" htmlFor="speed">Speed</label>
                      <select
                        name="speed"
                        value={bulkPort.speed}
                        onChange={handleBulkPortChange}
                        className="border px-2 py-1 rounded w-full"
                      >
                        <option value="">--</option>
                        {Object.values(PortSpeed).map(s => (
                          <option value={s} key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" htmlFor="connectorType">Connector</label>
                      <select
                        name="connectorType"
                        value={bulkPort.connectorType}
                        onChange={handleBulkPortChange}
                        className="border px-2 py-1 rounded w-full"
                      >
                        <option value="">--</option>
                        {Object.values(ConnectorType).map(ct => (
                          <option value={ct} key={ct}>{ct}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" htmlFor="quantity">Qty</label>
                      <input
                        type="number"
                        min={1}
                        name="quantity"
                        value={bulkPort.quantity}
                        onChange={handleBulkPortChange}
                        className="border px-2 py-1 rounded w-full"
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
                      onClick={handleBulkAddPorts}
                    >
                      Add Ports
                    </button>
                  </div>
                </div>
              )}
              {/* ---- END BULK PORTS SECTION ---- */}

              {/* ---- SINGLE PORTS SECTION - Not for Transceivers or Cables ---- */}
              {formValues.type !== ComponentType.Transceiver && !isCable && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="font-semibold">Ports</div>
                    <Button type="button" size="sm" onClick={addPort} data-testid="add-port">Add Port</Button>
                  </div>
                  {(formValues.ports && formValues.ports.length > 0) ? (
                    <div className="space-y-2">
                      {formValues.ports.map((port: any, idx: number) => (
                        <div key={port.id || idx} className="border rounded p-3 flex flex-col sm:flex-row gap-2 items-center flex-wrap">
                          <Input
                            type="text"
                            placeholder="Name (e.g. eth0)"
                            value={port.name || ''}
                            onChange={e => handlePortChange(idx, 'name', e.target.value)}
                            className="w-32"
                          />
                          <select
                            value={port.role || ''}
                            className="border rounded px-2 py-1"
                            onChange={e => handlePortChange(idx, 'role', e.target.value)}
                          >
                            <option value="">Role</option>
                            {Object.values(PortRole).map(r => (
                              <option value={r} key={r}>{r}</option>
                            ))}
                          </select>
                          <select
                            value={port.speed || PortSpeed.Speed1G}
                            className="border rounded px-2 py-1"
                            onChange={e => handlePortChange(idx, 'speed', e.target.value)}
                          >
                            {Object.values(PortSpeed).map(s => (
                              <option value={s} key={s}>{s}</option>
                            ))}
                          </select>
                          <select
                            value={port.connectorType || ConnectorType.RJ45}
                            className="border rounded px-2 py-1"
                            onChange={e => handlePortChange(idx, 'connectorType', e.target.value)}
                          >
                            {Object.values(ConnectorType).map(ct => (
                              <option value={ct} key={ct}>{ct}</option>
                            ))}
                          </select>
                          <select
                            value={port.mediaType || ''}
                            className="border rounded px-2 py-1"
                            onChange={e => handlePortChange(idx, 'mediaType', e.target.value || undefined)}
                          >
                            <option value="">Media Type (Optional)</option>
                            {Object.values(MediaType).map(mt => (
                              <option value={mt} key={mt}>{mt}</option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removePort(idx)}
                            data-testid={`remove-port-${idx}`}
                          >Remove</Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 my-2">No ports defined. Add at least one port for network rules.</div>
                  )}
                </div>
              )}
              {/* ---- END PORTS SECTION ---- */}

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