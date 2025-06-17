// Form and input types

// Generic form field types
export interface FormField<T = string> {
  name: string;
  value: T;
  error?: string;
  touched?: boolean;
}

// Form state types
export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// Input event types
export interface InputChangeEvent {
  target: {
    name: string;
    value: string;
    type?: string;
    checked?: boolean;
  };
}

export interface SelectChangeEvent {
  name: string;
  value: string | string[];
}

export interface FileInputEvent {
  target: {
    files: FileList | null;
  };
}

// Validation types
export type ValidationRule<T> = (value: T) => string | undefined;
export type ValidationSchema<T> = Partial<Record<keyof T, ValidationRule<any>>>;

// Form submission types
export interface SubmitHandler<T> {
  (values: T): void | Promise<void>;
}

export interface FormHelpers<T> {
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  setFieldTouched: (field: keyof T, touched: boolean) => void;
  setErrors: (errors: Partial<Record<keyof T, string>>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  resetForm: () => void;
}

// Specific form value types
export interface ComponentFormValues {
  id?: string;
  type: string;
  name: string;
  manufacturer: string;
  model: string;
  cost: number;
  powerRequired: number;
  [key: string]: any;
}

export interface RequirementsFormValues {
  computeRequirements: {
    totalVCPUs: number;
    totalMemoryTB: number;
    overcommitRatio: number;
    averageVMVCPUs: number;
    averageVMMemoryGB: number;
  };
  storageRequirements: {
    totalCapacityTB: number;
    dataProtection: string;
    growthRatePercent: number;
  };
  networkRequirements: {
    networkTopology: string;
    physicalFirewalls: boolean;
    leafSwitchesPerAZ: number;
  };
  physicalConstraints: {
    totalAvailabilityZones: number;
    rackUnitsPerRack: number;
    maxPowerPerRackKW: number;
  };
}

// Field configuration types
export interface FieldConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  accept?: string;
}

// Dynamic form types
export interface DynamicFormField extends FieldConfig {
  dependsOn?: string;
  showWhen?: (values: any) => boolean;
  validate?: ValidationRule<any>;
  transform?: (value: any) => any;
}