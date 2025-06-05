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
  // preferredRack: z.number().optional(), // Removed as per request
  // Server specific fields
  serverRole: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(ServerRole).optional()
  ),
  cpuModel: z.string().optional(),
  cpuSockets: z.number().optional(),
  cpuCoresPerSocket: z.number().optional(),
  memoryCapacity: z.number().optional(),
  diskSlotType: z.nativeEnum(DiskSlotType).optional(),
  diskSlotQuantity: z.number().optional(),
  ruSize: z.number().optional(),
  networkPortType: z.nativeEnum(NetworkPortType).optional(),
  portsConsumedQuantity: z.number().optional(),
  // Switch specific fields
  switchRole: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(SwitchRole).optional()
  ),
  // portCount: z.number().optional(), // Commented out as per request
  // portSpeed: z.string().optional(), // Commented out as per request
  portSpeedType: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.nativeEnum(PortSpeed).optional()
  ),
  portsProvidedQuantity: z.number().optional(),
  // layer: z.number().optional(), // Commented out as per request
  // Disk specific fields
  capacityTB: z.number().optional(),
  formFactor: z.string().optional(),
  interface: z.string().optional(),
  diskType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(DiskType).optional()
  ),
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
  // New cassette fields
  frontPortType: z.nativeEnum(ConnectorType).optional(),
  frontPortQuantity: z.number().optional(),
  backPortType: z.nativeEnum(ConnectorType).optional(),
  backPortQuantity: z.number().optional(),
  // Cable specific fields
  connectorA_Type: z.nativeEnum(ConnectorType).optional(),
  connectorB_Type: z.nativeEnum(ConnectorType).optional(),
  mediaType: z.nativeEnum(CableMediaType).optional(),
  cableSpeed: z.nativeEnum(PortSpeed).optional(),
  // Transceiver specific fields
  mediaTypeSupported: z.array(z.nativeEnum(MediaType)).optional(),
  connectorType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(ConnectorType).optional()
  ),
  mediaConnectorType: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(ConnectorType).optional()
  ),
  speed: z.preprocess(
    (val) => (val === "" || val === undefined) ? undefined : val,
    z.nativeEnum(PortSpeed).optional()
  ),
  maxDistanceMeters: z.number().optional(),
  breakoutCompatible: z.boolean().optional(),
  // Breakout cable fields
  isBreakout: z.boolean().optional(),
  connectorB_Quantity: z.number().optional()
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
  onSubmit: (data: z.infer<typeof formSchema>) => void;
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
      // preferredRack: formValues.placement?.preferredRack || 1, // Removed
      serverRole: formValues.type === ComponentType.Server ? (formValues.serverRole || ServerRole.Compute) : undefined,
      cpuModel: formValues.type === ComponentType.Server ? (formValues.cpuModel || '') : undefined,
      cpuSockets: formValues.type === ComponentType.Server ? (formValues.cpuSockets || 1) : undefined,
      cpuCoresPerSocket: formValues.type === ComponentType.Server ? (formValues.cpuCoresPerSocket || 4) : undefined,
      memoryCapacity: formValues.type === ComponentType.Server ? (formValues.memoryCapacity || 0) : undefined,
      diskSlotType: formValues.type === ComponentType.Server ? (formValues.diskSlotType || DiskSlotType.TwoPointFive) : undefined,
      diskSlotQuantity: formValues.type === ComponentType.Server ? (formValues.diskSlotQuantity || 8) : undefined,
      ruSize: formValues.type === ComponentType.Server ? (formValues.ruSize || 1) : undefined,
      networkPortType: formValues.type === ComponentType.Server ? (formValues.networkPortType || NetworkPortType.SFP) : undefined,
      portsConsumedQuantity: formValues.type === ComponentType.Server ? (formValues.portsConsumedQuantity || 2) : undefined,
      switchRole: formValues.type === ComponentType.Switch ? (formValues.switchRole || SwitchRole.Access) : undefined,
      // portCount: formValues.portCount || 24, // Commented out
      // portSpeed: formValues.portSpeed || '10', // Commented out
      portSpeedType: formValues.type === ComponentType.Switch ? (formValues.portSpeedType || PortSpeed.Speed10G) : undefined,
      portsProvidedQuantity: formValues.type === ComponentType.Switch ? (formValues.portsProvidedQuantity || 24) : undefined,
      // layer: formValues.layer || 3, // Commented out
      capacityTB: formValues.type === ComponentType.Disk ? (formValues.capacityTB || 1) : undefined,
      formFactor: formValues.type === ComponentType.Disk ? (formValues.formFactor || '2.5"') : undefined,
      interface: formValues.type === ComponentType.Disk ? (formValues.interface || 'SATA') : undefined,
      diskType: formValues.type === ComponentType.Disk ? (formValues.diskType || DiskType.SATASSD) : undefined,
      rpm: formValues.type === ComponentType.Disk ? (formValues.rpm || 7200) : undefined,
      iops: formValues.type === ComponentType.Disk ? (formValues.iops || 10000) : undefined,
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

  const handleFormSubmit = (data: z.infer<typeof formSchema>) => {
    // --- ADDED LOG --- 
    console.log('[ComponentFormDialog] handleFormSubmit (onValid) called with data:', data);
    onSubmit(data);
  };

  // --- ADDED LOG HANDLER ---
  const handleFormErrors = (errors: any) => {
    console.error('[ComponentFormDialog] Form validation failed (onInvalid):', errors);
    // You can add more specific error handling or user notification here if needed
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
                    {formValues.type !== ComponentType.Cassette && 
                     formValues.type !== ComponentType.FiberPatchPanel && 
                     formValues.type !== ComponentType.CopperPatchPanel && (
                      <>
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
                      </>
                    )}
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
                      {formValues.ports.map((port: any, idx: number) => {
                        const isPassiveDevice = formValues.type === ComponentType.Cassette || 
                                               formValues.type === ComponentType.FiberPatchPanel || 
                                               formValues.type === ComponentType.CopperPatchPanel;
                        return (
                          <div key={port.id || idx} className="border rounded p-3 flex flex-col sm:flex-row gap-2 items-center flex-wrap">
                            <Input
                              type="text"
                              placeholder="Name (e.g. eth0)"
                              value={port.name || ''}
                              onChange={e => handlePortChange(idx, 'name', e.target.value)}
                              className="w-32"
                            />
                            {!isPassiveDevice && (
                              <>
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
                              </>
                            )}
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
                        );
                      })}
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
          <Button type="submit" form="component-form">{isEditing ? 'Update' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};