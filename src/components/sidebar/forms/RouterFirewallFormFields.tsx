
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

interface RouterFirewallFormFieldsProps {
  register: Record<string, unknown>;
}

export const RouterFirewallFormFields: React.FC<RouterFirewallFormFieldsProps> = ({ register }) => {
  return (
    <>
      <FormField
        control={register.control}
        name="ruSize"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rack Units (RU)</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                {...field} 
                onChange={e => field.onChange(Number(e.target.value))}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );
};
