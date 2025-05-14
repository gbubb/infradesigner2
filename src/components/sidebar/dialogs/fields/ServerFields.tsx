
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServerRole, DiskSlotType, NetworkPortType } from "@/types/infrastructure";

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
}) => (
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
);
