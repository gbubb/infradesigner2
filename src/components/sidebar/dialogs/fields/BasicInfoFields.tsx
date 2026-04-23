import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ComponentType } from "@/types/infrastructure";
import { Control } from "react-hook-form";
import { LegacyFormData } from "../forms/component-forms/ComponentValidationSchemas";

interface Props {
  control: Control<LegacyFormData>;
  formValues: Record<string, unknown>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
  onTypeChange: (value: string) => void;
}

export const BasicInfoFields: React.FC<Props> = ({
  control,
  formValues: _formValues,
  onInputChange,
  onSelectChange: _onSelectChange,
  onTypeChange
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <SelectItem value={ComponentType.Transceiver}>{ComponentType.Transceiver}</SelectItem>
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
  </div>
);
