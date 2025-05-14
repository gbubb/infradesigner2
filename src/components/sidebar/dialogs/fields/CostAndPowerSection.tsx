
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface Props {
  control: any;
  formValues: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CostAndPowerSection: React.FC<Props> = ({
  control,
  formValues,
  onInputChange
}) => {
  // Hide for patch panels and cassette
  if (
    ["FiberPatchPanel", "CopperPatchPanel", "Cassette"].includes(formValues.type)
  ) {
    return null;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
  );
};
