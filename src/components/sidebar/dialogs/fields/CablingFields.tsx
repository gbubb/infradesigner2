
import React from "react";
import { CablingFormFields } from "../../forms/CablingFormFields";

interface Props {
  control: any;
  componentType: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (name: string, value: string) => void;
}

export const CablingFields: React.FC<Props> = ({ control, componentType, onInputChange, onSelectChange }) => (
  <CablingFormFields register={{ control }} componentType={componentType} onInputChange={onInputChange} onSelectChange={onSelectChange} />
);
