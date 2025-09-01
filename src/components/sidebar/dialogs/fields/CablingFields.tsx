
import React from "react";
import { CablingFormFields } from "../../forms/CablingFormFields";
import { Control } from "react-hook-form";
import { LegacyFormData } from "../forms/component-forms/ComponentValidationSchemas";

interface Props {
  control: Control<LegacyFormData>;
  componentType: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export const CablingFields: React.FC<Props> = ({ control, componentType, onInputChange, onSelectChange }) => (
  <CablingFormFields control={control} componentType={componentType} onInputChange={onInputChange} onSelectChange={onSelectChange} />
);
