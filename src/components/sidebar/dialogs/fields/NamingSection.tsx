
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control } from "react-hook-form";
import { LegacyFormData } from "../forms/component-forms/ComponentValidationSchemas";

interface Props {
  control: Control<LegacyFormData>;
  formValues: Record<string, unknown>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getDefaultPrefix: (type: string) => string;
}

export const NamingSection: React.FC<Props> = ({
  control,
  formValues,
  onInputChange,
  getDefaultPrefix,
}) => (
  <div className="mt-6 pt-6 border-t">
    <h3 className="text-lg font-medium">Naming</h3>
    <p className="text-sm text-muted-foreground mb-4">
      Configure how this component will be named in designs
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={control}
        name="namingPrefix"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Default Name Prefix</FormLabel>
            <FormControl>
              <Input
                placeholder="Name Prefix"
                {...field}
                value={field.value || getDefaultPrefix(formValues.type as string)}
                onChange={(e) => {
                  field.onChange(e);
                  onInputChange(e);
                }}
              />
            </FormControl>
            <FormDescription>
              Used as a prefix when generating component names
            </FormDescription>
          </FormItem>
        )}
      />
    </div>
  </div>
);
