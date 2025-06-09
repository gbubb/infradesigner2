import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CalibrationInputFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  defaultValue?: string;
  description?: string;
  unit?: string;
}

export const CalibrationInputField: React.FC<CalibrationInputFieldProps> = ({
  label,
  value,
  onChange,
  step = 0.01,
  min,
  max,
  defaultValue,
  description,
  unit
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    // Only call onChange if the value is valid (not NaN)
    if (!isNaN(newValue)) {
      onChange(newValue);
    }
  };

  return (
    <div>
      <Label>{label}{unit && ` (${unit})`}</Label>
      <Input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
      />
      {(defaultValue || description) && (
        <p className="text-xs text-muted-foreground mt-1">
          {defaultValue && `Default: ${defaultValue}`}
          {defaultValue && description && ' - '}
          {description}
        </p>
      )}
    </div>
  );
};