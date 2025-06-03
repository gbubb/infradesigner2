import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox'; // For multi-select mediaTypeSupported
import { Switch } from '@/components/ui/switch';
import { ComponentType, ConnectorType } from '@/types/infrastructure';
import { PortSpeed, MediaType } from '@/types/infrastructure/port-types';

interface OpticsFieldsProps {
  control: Control<any>;
  // formValues: any; // If needed for conditional rendering or complex logic not handled by RHF control
  // onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  // onSelectChange: (name: string, value: string | string[]) => void; // For multi-select
}

export const OpticsFields: React.FC<OpticsFieldsProps> = ({ control }) => {
  const mediaTypes = Object.values(MediaType).filter(mt => mt === MediaType.FiberMM || mt === MediaType.FiberSM);

  return (
    <div className="space-y-4 border p-4 rounded-lg">
      <h3 className="text-lg font-medium">Optical Properties</h3>

      <FormField
        control={control}
        name="speed"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Speed</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select speed" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(PortSpeed).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="connectorType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Port-Side Connector</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select port-side connector" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(ConnectorType).filter(ct => ct === ConnectorType.SFP || ct === ConnectorType.QSFP || ct === ConnectorType.QSFP_DD).map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Connector that plugs into the device port (e.g., SFP, QSFP).</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="mediaConnectorType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Media-Side Connector</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select media-side connector" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(ConnectorType).filter(ct => ct === ConnectorType.LC || ct === ConnectorType.MPO12).map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Connector for the fiber/media (e.g., LC, MPO-12).</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormItem>
        <FormLabel>Media Types Supported</FormLabel>
        <FormDescription>Select fiber media types this transceiver supports.</FormDescription>
        <FormField
            control={control}
            name="mediaTypeSupported"
            render={({ field }) => (
                <div className="space-y-2 pt-2">
                    {mediaTypes.map((item) => (
                        <FormField
                        key={item}
                        control={control}
                        name="mediaTypeSupported"
                        render={({ field: itemField }) => {
                            return (
                            <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                            >
                                <FormControl>
                                <Checkbox
                                    checked={itemField.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                    return checked
                                        ? itemField.onChange([...(itemField.value || []), item])
                                        : itemField.onChange(
                                            (itemField.value || []).filter(
                                            (value: MediaType) => value !== item
                                            )
                                        );
                                    }}
                                />
                                </FormControl>
                                <FormLabel className="font-normal">
                                {item}
                                </FormLabel>
                            </FormItem>
                            );
                        }}
                        />
                    ))}
                </div>
            )}
        />
        <FormMessage />
      </FormItem>

      <FormField
        control={control}
        name="breakoutCompatible"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Breakout Compatible</FormLabel>
              <FormDescription>
                Enable if this transceiver supports breakout connections (e.g., 1x400G to 4x100G)
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value || false}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="maxDistanceMeters"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Max Distance (meters)</FormLabel>
            <FormControl>
              <Input type="number" placeholder="e.g., 300" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}; 