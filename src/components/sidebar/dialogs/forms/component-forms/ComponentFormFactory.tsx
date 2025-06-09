import React from 'react';
import { Control } from 'react-hook-form';
import { ComponentType } from '@/types/infrastructure';
import { LegacyFormData } from './ComponentValidationSchemas';

// Import existing field components
import { ServerFields } from '../../fields/ServerFields';
import { SwitchFields } from '../../fields/SwitchFields';
import { RouterFirewallFields } from '../../fields/RouterFirewallFields';
import { CablingFields } from '../../fields/CablingFields';
import { OpticsFields } from '../../fields/OpticsFields';

// Import new form components (to be created)
import { DiskComponentForm } from './DiskComponentForm';
import { GPUComponentForm } from './GPUComponentForm';

interface ComponentFormFactoryProps {
  control: Control<LegacyFormData>;
  componentType: ComponentType;
  formValues: any;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export const ComponentFormFactory: React.FC<ComponentFormFactoryProps> = ({
  control,
  componentType,
  formValues,
  onInputChange,
  onSelectChange,
}) => {
  switch (componentType) {
    case ComponentType.Server:
      return (
        <ServerFields
          control={control}
          formValues={formValues}
          onInputChange={onInputChange}
          onSelectChange={onSelectChange}
        />
      );

    case ComponentType.Switch:
      return (
        <SwitchFields
          control={control}
          formValues={formValues}
          onInputChange={onInputChange}
          onSelectChange={onSelectChange}
        />
      );

    case ComponentType.Router:
    case ComponentType.Firewall:
      return <RouterFirewallFields control={control} />;

    case ComponentType.Disk:
      return (
        <DiskComponentForm
          control={control}
          formValues={formValues}
          onInputChange={onInputChange}
          onSelectChange={onSelectChange}
        />
      );

    case ComponentType.GPU:
      return (
        <GPUComponentForm
          control={control}
          formValues={formValues}
          onInputChange={onInputChange}
          onSelectChange={onSelectChange}
        />
      );

    case ComponentType.FiberPatchPanel:
    case ComponentType.CopperPatchPanel:
    case ComponentType.Cassette:
    case ComponentType.Cable:
      return (
        <CablingFields
          control={control}
          componentType={componentType}
          onInputChange={onInputChange}
          onSelectChange={onSelectChange}
        />
      );

    case ComponentType.Transceiver:
      return <OpticsFields control={control} />;

    default:
      return null;
  }
};