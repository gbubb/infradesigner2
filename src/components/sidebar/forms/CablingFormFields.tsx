import React from 'react';
import { useWatch } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ConnectorType } from '@/types/infrastructure';
import { PortSpeed, CableMediaType, PortSide } from '@/types/infrastructure/port-types';

interface CablingFormFieldsProps {
  register: Record<string, unknown>;
  componentType: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export const CablingFormFields: React.FC<CablingFormFieldsProps> = ({ register, componentType, onInputChange, onSelectChange }) => {
  const isBreakout = useWatch({
    control: register.control,
    name: 'isBreakout',
    defaultValue: false
  });
  
  // Filter connector types based on component type
  const getAvailableConnectorTypes = (componentType: string) => {
    if (componentType === 'Cassette' || componentType === 'FiberPatchPanel' || componentType === 'CopperPatchPanel') {
      // Passive devices - only physical connectors, no active ports
      return [ConnectorType.RJ45, ConnectorType.MPO12, ConnectorType.LC];
    }
    // Cables can have all connector types
    return Object.values(ConnectorType);
  };
  
  const availableConnectors = getAvailableConnectorTypes(componentType);
  
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
          
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Back-Side Ports (Input)</h4>
            <FormField
              control={register.control}
              name="backPortType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connector Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      onSelectChange('backPortType', value);
                    }}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select connector type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableConnectors.map(connector => (
                        <SelectItem key={connector} value={connector}>{connector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={register.control}
              name="backPortQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      name="backPortQuantity"
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
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Front-Side Ports (Output)</h4>
            <FormField
              control={register.control}
              name="frontPortType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connector Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      onSelectChange('frontPortType', value);
                    }}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select connector type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableConnectors.map(connector => (
                        <SelectItem key={connector} value={connector}>{connector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={register.control}
              name="frontPortQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      name="frontPortQuantity"
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
          </div>
        </>
      )}
      
      {componentType === 'Cassette' && (
        <>
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Back-Side Ports (Input)</h4>
            <FormField
              control={register.control}
              name="backPortType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connector Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      onSelectChange('backPortType', value);
                    }}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select connector type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableConnectors.map(connector => (
                        <SelectItem key={connector} value={connector}>{connector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={register.control}
              name="backPortQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      name="backPortQuantity"
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
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Front-Side Ports (Output)</h4>
            <FormField
              control={register.control}
              name="frontPortType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connector Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      onSelectChange('frontPortType', value);
                    }}
                    value={field.value || ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select connector type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableConnectors.map(connector => (
                        <SelectItem key={connector} value={connector}>{connector}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <FormField
              control={register.control}
              name="frontPortQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      name="frontPortQuantity"
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
          </div>
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
                    {availableConnectors.map(connector => (
                      <SelectItem key={connector} value={connector}>{connector}</SelectItem>
                    ))}
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
                    {availableConnectors.map(connector => (
                      <SelectItem key={connector} value={connector}>{connector}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <FormField
            control={register.control}
            name="mediaType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Media Type</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    onSelectChange('mediaType', value);
                  }}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cable media type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(CableMediaType).map(cmt => (
                      <SelectItem key={cmt} value={cmt}>{cmt}</SelectItem>
                    ))}
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
          
          <FormField
            control={register.control}
            name="isBreakout"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Breakout Cable</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Enable for cables that split one high-speed port into multiple lower-speed ports
                  </div>
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
          
          {isBreakout && (
            <FormField
              control={register.control}
              name="connectorB_Quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connector B Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      name="connectorB_Quantity"
                      onChange={e => {
                        const value = Number(e.target.value) || 1;
                        field.onChange(value);
                      }}
                      value={field.value || 4}
                      min={1}
                      max={4}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
        </>
      )}
    </>
  );
};
