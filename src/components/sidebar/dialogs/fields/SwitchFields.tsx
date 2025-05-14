
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SwitchRole } from "@/types/infrastructure";
import { PortSpeed } from "@/types/infrastructure/port-types";

interface Props {
  control: any;
  formValues: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export const SwitchFields: React.FC<Props> = ({
  control,
  formValues,
  onInputChange,
  onSelectChange,
}) => (
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
                value={field.value ?? ""}
                onChange={e => {
                  const val = e.target.value;
                  field.onChange(val === "" ? null : Number(val));
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
                value={field.value ?? ""} 
                onChange={e => {
                  const val = e.target.value;
                  field.onChange(val === "" ? 0 : Number(val)); 
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
                value={field.value ?? ""} 
                onChange={e => {
                  const val = e.target.value;
                  field.onChange(val === "" ? 0 : Number(val));
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
                value={field.value ?? ""} 
                onChange={e => {
                  const val = e.target.value;
                  field.onChange(val === "" ? 0 : Number(val));
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
);
