import React from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConnectorType } from '@/types/infrastructure';
import { PortSpeed } from '@/types/infrastructure/port-types';

interface CablingFormFieldsProps {
  register: any;
  componentType: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export const CablingFormFields: React.FC<CablingFormFieldsProps> = ({ register, componentType, onInputChange, onSelectChange }) => {
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
                    name="ruSize"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
                      onInputChange(e);
                    }}
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
                    name="cassetteCapacity"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
                      onInputChange(e);
                    }}
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
                    name="ruSize"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
                      onInputChange(e);
                    }}
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
                    name="portQuantity"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
                      onInputChange(e);
                    }}
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
                  onValueChange={(value) => {
                    field.onChange(value);
                    onSelectChange('portType', value);
                  }}
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
                    name="portQuantity"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
                      onInputChange(e);
                    }}
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
                    name="length"
                    onChange={e => {
                      const value = Number(e.target.value) || 0;
                      field.onChange(value);
                      onInputChange(e);
                    }}
                    value={field.value || 0}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <FormField
            control={register.control}
            name="connectorA_Type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connector A Type</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    onSelectChange('connectorA_Type', value);
                  }}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select connector A type" />
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
            name="connectorB_Type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connector B Type</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    onSelectChange('connectorB_Type', value);
                  }}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select connector B type" />
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
            name="cableSpeed"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Speed (Optional - for DACs)</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    const actualValue = value === "--none--" ? undefined : value;
                    field.onChange(actualValue);
                    onSelectChange('cableSpeed', actualValue || '' );
                  }}
                  value={field.value || "--none--"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select speed (N/A)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="--none--">N/A (e.g. for Fiber)</SelectItem>
                    {Object.values(PortSpeed).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
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
