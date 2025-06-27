import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LegacyFormData } from './ComponentValidationSchemas';

interface GPUComponentFormProps {
  control: Control<LegacyFormData>;
  formValues: Record<string, unknown>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export const GPUComponentForm: React.FC<GPUComponentFormProps> = ({
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
          name="gpuModel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GPU Model</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. NVIDIA A100"
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
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
          name="memoryGB"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Memory (GB)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g. 80"
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
          name="tensorCores"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tensor Cores</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g. 432"
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
          name="cudaCores"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CUDA Cores</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  placeholder="e.g. 6912"
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

      <FormField
        control={control}
        name="tdp"
        render={({ field }) => (
          <FormItem>
            <FormLabel>TDP (Watts)</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                placeholder="e.g. 400"
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
  );
};