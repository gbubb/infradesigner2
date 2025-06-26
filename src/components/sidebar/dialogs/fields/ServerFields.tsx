import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServerRole, DiskSlotType, NetworkPortType, MemoryType, PCIeFormFactor, PSUEfficiencyRating } from "@/types/infrastructure";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  control: any;
  formValues: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export const ServerFields: React.FC<Props> = ({
  control,
  formValues,
  onInputChange,
  onSelectChange
}) => {
  // Parse pcieSlots if it's a string, otherwise use it as is
  const initialPcieSlots = React.useMemo(() => {
    if (typeof formValues.pcieSlots === 'string') {
      try {
        return JSON.parse(formValues.pcieSlots);
      } catch {
        return [];
      }
    }
    return formValues.pcieSlots || [];
  }, [formValues.pcieSlots]);

  const [pcieSlots, setPcieSlots] = React.useState(initialPcieSlots);

  // Update local state when formValues change
  React.useEffect(() => {
    setPcieSlots(initialPcieSlots);
  }, [initialPcieSlots]);

  const addPcieSlot = () => {
    const newSlot = { quantity: 1, formFactor: PCIeFormFactor.FHFL };
    const updatedSlots = [...pcieSlots, newSlot];
    setPcieSlots(updatedSlots);
    // Create a synthetic event to update the form
    const syntheticEvent = {
      target: {
        name: 'pcieSlots',
        value: updatedSlots
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(syntheticEvent);
  };

  const removePcieSlot = (index: number) => {
    const updatedSlots = pcieSlots.filter((_, i) => i !== index);
    setPcieSlots(updatedSlots);
    // Create a synthetic event to update the form
    const syntheticEvent = {
      target: {
        name: 'pcieSlots',
        value: updatedSlots
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(syntheticEvent);
  };

  const updatePcieSlot = (index: number, field: 'quantity' | 'formFactor', value: any) => {
    const updatedSlots = [...pcieSlots];
    updatedSlots[index][field] = field === 'quantity' ? Number(value) : value;
    setPcieSlots(updatedSlots);
    // Create a synthetic event to update the form
    const syntheticEvent = {
      target: {
        name: 'pcieSlots',
        value: updatedSlots
      }
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(syntheticEvent);
  };

  return (
    <>
      {/* Server Role Selection */}
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
                <SelectItem value={ServerRole.Infrastructure}>{ServerRole.Infrastructure}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Physical Attributes Section */}
      <div className="space-y-4 mt-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Physical Attributes</h4>
          <Separator className="mb-4" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="diskSlotQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disk Slot Capacity</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  <SelectItem value={DiskSlotType.SATABay}>{DiskSlotType.SATABay}</SelectItem>
                  <SelectItem value={DiskSlotType.SASBay}>{DiskSlotType.SASBay}</SelectItem>
                  <SelectItem value={DiskSlotType.NVMeBay}>{DiskSlotType.NVMeBay}</SelectItem>
                  <SelectItem value={DiskSlotType.PCIeSlot}>{DiskSlotType.PCIeSlot}</SelectItem>
                  <SelectItem value={DiskSlotType.TwoPointFive}>{DiskSlotType.TwoPointFive}</SelectItem>
                  <SelectItem value={DiskSlotType.ThreePointFive}>{DiskSlotType.ThreePointFive}</SelectItem>
                  <SelectItem value={DiskSlotType.NVMe}>{DiskSlotType.NVMe}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* PCIe Slots Management */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <FormLabel>PCIe Slot Capacity</FormLabel>
            <Button type="button" size="sm" variant="outline" onClick={addPcieSlot}>
              <Plus className="h-4 w-4 mr-1" />
              Add PCIe Slot
            </Button>
          </div>
          {pcieSlots.length > 0 && (
            <div className="space-y-2">
              {pcieSlots.map((slot, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={slot.quantity}
                        onChange={(e) => updatePcieSlot(index, 'quantity', e.target.value)}
                      />
                    </FormControl>
                  </FormItem>
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">Form Factor</FormLabel>
                    <Select
                      value={slot.formFactor}
                      onValueChange={(value) => updatePcieSlot(index, 'formFactor', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PCIeFormFactor.FHFL}>FHFL (Full Height Full Length)</SelectItem>
                        <SelectItem value={PCIeFormFactor.HHFL}>HHFL (Half Height Full Length)</SelectItem>
                        <SelectItem value={PCIeFormFactor.FHHL}>FHHL (Full Height Half Length)</SelectItem>
                        <SelectItem value={PCIeFormFactor.HHHL}>HHHL (Half Height Half Length)</SelectItem>
                        <SelectItem value={PCIeFormFactor.LP}>LP (Low Profile)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removePcieSlot(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CPU Section */}
      <div className="space-y-4 mt-6">
        <div>
          <h4 className="text-sm font-medium mb-3">CPU</h4>
          <Separator className="mb-4" />
        </div>
        
        <FormField
          control={control}
          name="cpuModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPU Model</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Intel Xeon Gold 6248R" {...field} onChange={(e) => {
                  field.onChange(e);
                  onInputChange(e);
                }} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="cpuCoresPerSocket"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cores per Socket</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="cpuTdpWatts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>TDP (Watts)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    name="cpuTdpWatts"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
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
            name="cpuFrequencyBaseGhz"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Frequency (GHz)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1"
                    {...field} 
                    name="cpuFrequencyBaseGhz"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
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
            name="cpuFrequencyTurboGhz"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Turbo Frequency (GHz)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1"
                    {...field} 
                    name="cpuFrequencyTurboGhz"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
                      onInputChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Memory Section */}
      <div className="space-y-4 mt-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Memory</h4>
          <Separator className="mb-4" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="memoryType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DIMM Type</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    onSelectChange('memoryType', value);
                  }}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select memory type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={MemoryType.DDR3}>DDR3</SelectItem>
                    <SelectItem value={MemoryType.DDR4}>DDR4</SelectItem>
                    <SelectItem value={MemoryType.DDR5}>DDR5</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="memoryDimmFrequencyMhz"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DIMM Frequency (MHz)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    name="memoryDimmFrequencyMhz"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
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
            name="memoryDimmSlotCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DIMM Slot Capacity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    name="memoryDimmSlotCapacity"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
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
            name="memoryDimmSlotsConsumed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DIMM Slots Consumed</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    name="memoryDimmSlotsConsumed"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
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
            name="memoryDimmSize"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DIMM Size (GB)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    name="memoryDimmSize"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
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
            name="memoryCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Memory Capacity (GB)</FormLabel>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Power Supply Section */}
      <div className="space-y-4 mt-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Power Supply</h4>
          <Separator className="mb-4" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="psuRatingWatts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PSU Rating (Watts)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    name="psuRatingWatts"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
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
            name="psuQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PSU Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    name="psuQuantity"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
                      onInputChange(e);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={control}
          name="psuEfficiency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PSU Efficiency Rating</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  onSelectChange('psuEfficiency', value);
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select efficiency rating" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={PSUEfficiencyRating.Standard}>{PSUEfficiencyRating.Standard}</SelectItem>
                  <SelectItem value={PSUEfficiencyRating.Bronze}>{PSUEfficiencyRating.Bronze}</SelectItem>
                  <SelectItem value={PSUEfficiencyRating.Silver}>{PSUEfficiencyRating.Silver}</SelectItem>
                  <SelectItem value={PSUEfficiencyRating.Gold}>{PSUEfficiencyRating.Gold}</SelectItem>
                  <SelectItem value={PSUEfficiencyRating.Platinum}>{PSUEfficiencyRating.Platinum}</SelectItem>
                  <SelectItem value={PSUEfficiencyRating.Titanium}>{PSUEfficiencyRating.Titanium}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Network Section */}
      <div className="space-y-4 mt-6">
        <div>
          <h4 className="text-sm font-medium mb-3">Network</h4>
          <Separator className="mb-4" />
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
                    <SelectItem value={NetworkPortType.RJ45}>{NetworkPortType.RJ45}</SelectItem>
                    <SelectItem value={NetworkPortType.SFP}>{NetworkPortType.SFP}</SelectItem>
                    <SelectItem value={NetworkPortType.SFPlus}>{NetworkPortType.SFPlus}</SelectItem>
                    <SelectItem value={NetworkPortType.QSFP}>{NetworkPortType.QSFP}</SelectItem>
                    <SelectItem value={NetworkPortType.QSFPPlus}>{NetworkPortType.QSFPPlus}</SelectItem>
                    <SelectItem value={NetworkPortType.QSFPPlusPlusDD}>{NetworkPortType.QSFPPlusPlusDD}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </>
  );
};