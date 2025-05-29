import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface Props {
  control: any;
  formValues: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maxRackUnits: number;
  ComponentType: any;
}

export const PlacementSection: React.FC<Props> = ({
  control,
  formValues,
  onInputChange,
  maxRackUnits,
  ComponentType
}) => {
  if (
    formValues.type === ComponentType.Cable ||
    formValues.type === ComponentType.Disk ||
    formValues.type === ComponentType.GPU
  ) {
    return null;
  }
  return (
    <div className="mt-6 pt-6 border-t">
      <h3 className="text-lg font-medium">Placement</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Define valid rack positions for this component
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="validRUStart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valid RU Range Start</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max={maxRackUnits}
                  {...field}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 1 && value <= maxRackUnits) {
                      field.onChange(value);
                      onInputChange(e);
                    }
                  }}
                />
              </FormControl>
              <FormDescription>
                Lowest RU position allowed (1 - {maxRackUnits})
              </FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="validRUEnd"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valid RU Range End</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max={maxRackUnits}
                  {...field}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 1 && value <= maxRackUnits) {
                      field.onChange(value);
                      onInputChange(e);
                    }
                  }}
                />
              </FormControl>
              <FormDescription>
                Highest RU position allowed (1 - {maxRackUnits})
              </FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="preferredRU"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred RU Position</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max={maxRackUnits}
                  {...field}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 1 && value <= maxRackUnits) {
                      field.onChange(value);
                      onInputChange(e);
                    }
                  }}
                />
              </FormControl>
              <FormDescription>
                Recommended position in rack
              </FormDescription>
            </FormItem>
          )}
        />
        {/* <FormField
          control={control}
          name="preferredRack"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Rack</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 1) {
                      field.onChange(value);
                      onInputChange(e);
                    }
                  }}
                />
              </FormControl>
              <FormDescription>
                Recommended rack number
              </FormDescription>
            </FormItem>
          )}
        /> */}
      </div>
    </div>
  );
};
