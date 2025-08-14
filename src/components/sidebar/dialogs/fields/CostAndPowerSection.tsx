
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control } from "react-hook-form";
import { LegacyFormData } from "../forms/component-forms/ComponentValidationSchemas";

interface Props {
  control: Control<LegacyFormData>;
  formValues: Record<string, unknown>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CostAndPowerSection: React.FC<Props> = ({
  control,
  formValues,
  onInputChange
}) => {
  // Hide for patch panels and cassette
  if (
    ["FiberPatchPanel", "CopperPatchPanel", "Cassette"].includes(formValues.type as string)
  ) {
    return null;
  }
  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name="cost"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cost ($)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Cost"
                {...field}
                value={field.value ?? ""}
                onChange={e => {
                  field.onChange(Number(e.target.value));
                  onInputChange(e);
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Enhanced Power Consumption Fields */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Enhanced Power Consumption</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="powerIdle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Idle Power (Watts)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Idle Power"
                    {...field}
                    value={field.value ?? ""}
                    onChange={e => {
                      field.onChange(Number(e.target.value));
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
            name="powerTypical"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Typical Power (Watts)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Typical Power"
                    {...field}
                    value={field.value ?? ""}
                    onChange={e => {
                      field.onChange(Number(e.target.value));
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
            name="powerPeak"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peak Power (Watts)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Peak Power"
                    {...field}
                    value={field.value ?? ""}
                    onChange={e => {
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
      </div>
    </div>
  );
};
