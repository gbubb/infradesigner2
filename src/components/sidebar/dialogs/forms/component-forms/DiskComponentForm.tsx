import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DiskType } from '@/types/infrastructure';
import { LegacyFormData } from './ComponentValidationSchemas';

interface DiskComponentFormProps {
  control: Control<LegacyFormData>;
  formValues: Record<string, unknown>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

const interfaceTypes = ["SATA", "SAS", "NVMe", "PCIe"];
const formFactors = ['2.5"', '3.5"', 'M.2', 'U.2', 'E1.S', 'E1.L'];

export const DiskComponentForm: React.FC<DiskComponentFormProps> = ({
  control,
  formValues,
  onInputChange,
  onSelectChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="capacityTB"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacity (TB)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g. 8"
                  min={0}
                  value={field.value || 0}
                  onChange={(e) => {
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
          name="diskType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Disk Type</FormLabel>
              <Select
                value={field.value || ''}
                onValueChange={(value) => {
                  field.onChange(value);
                  onSelectChange('diskType', value);
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select disk type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(DiskType).map((dt) => (
                    <SelectItem key={dt} value={dt}>
                      {dt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="interface"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Interface Type</FormLabel>
              <Select
                value={field.value || ''}
                onValueChange={(value) => {
                  field.onChange(value);
                  onSelectChange('interface', value);
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select interface" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {interfaceTypes.map((iface) => (
                    <SelectItem key={iface} value={iface}>
                      {iface}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="formFactor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Form Factor</FormLabel>
              <Select
                value={field.value || ''}
                onValueChange={(value) => {
                  field.onChange(value);
                  onSelectChange('formFactor', value);
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select form factor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {formFactors.map((ff) => (
                    <SelectItem key={ff} value={ff}>
                      {ff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="rpm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RPM (for HDDs)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g. 7200"
                  min={0}
                  value={field.value || 0}
                  onChange={(e) => {
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
          name="iops"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IOPS</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g. 10000"
                  min={0}
                  value={field.value || 0}
                  onChange={(e) => {
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

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="readSpeed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Read Speed (MB/s)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g. 1000"
                  min={0}
                  value={field.value || 0}
                  onChange={(e) => {
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
          name="writeSpeed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Write Speed (MB/s)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g. 1000"
                  min={0}
                  value={field.value || 0}
                  onChange={(e) => {
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
  );
};