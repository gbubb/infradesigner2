
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConnectorType } from '@/types/infrastructure';

interface CablingFormFieldsProps {
  register: any;
  componentType: string;
}

export const CablingFormFields: React.FC<CablingFormFieldsProps> = ({ register, componentType }) => {
  return (
    <>
      {componentType === 'FiberPatchPanel' && (
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
                    onChange={e => field.onChange(Number(e.target.value) || 0)}
                    value={field.value || 0}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={register.control}
            name="cassetteCapacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cassette Capacity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={e => field.onChange(Number(e.target.value) || 0)}
                    value={field.value || 0}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </>
      )}
      
      {componentType === 'CopperPatchPanel' && (
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
                    onChange={e => field.onChange(Number(e.target.value) || 0)}
                    value={field.value || 0}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={register.control}
            name="portQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={e => field.onChange(Number(e.target.value) || 0)}
                    value={field.value || 0}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </>
      )}
      
      {componentType === 'Cassette' && (
        <>
          <FormField
            control={register.control}
            name="portType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port Type</FormLabel>
                <Select 
                  onValueChange={field.onChange}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a port type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ConnectorType.RJ45}>RJ45</SelectItem>
                    <SelectItem value={ConnectorType.MPO12}>MPO-12</SelectItem>
                    <SelectItem value={ConnectorType.LC}>LC</SelectItem>
                    <SelectItem value={ConnectorType.SFP}>SFP</SelectItem>
                    <SelectItem value={ConnectorType.QSFP}>QSFP</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          
          <FormField
            control={register.control}
            name="portQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={e => field.onChange(Number(e.target.value) || 0)}
                    value={field.value || 0}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </>
      )}
      
      {componentType === 'Cable' && (
        <>
          <FormField
            control={register.control}
            name="length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Length (meters)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    {...field} 
                    onChange={e => field.onChange(Number(e.target.value) || 0)}
                    value={field.value || 0}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={register.control}
            name="connectorType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connector Type</FormLabel>
                <Select 
                  onValueChange={field.onChange}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a connector type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={ConnectorType.RJ45}>RJ45</SelectItem>
                    <SelectItem value={ConnectorType.MPO12}>MPO-12</SelectItem>
                    <SelectItem value={ConnectorType.LC}>LC</SelectItem>
                    <SelectItem value={ConnectorType.SFP}>SFP</SelectItem>
                    <SelectItem value={ConnectorType.QSFP}>QSFP</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </>
      )}
    </>
  );
};
