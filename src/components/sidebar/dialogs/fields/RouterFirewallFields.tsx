
import React from "react";
import { RouterFirewallFormFields } from "../../forms/RouterFirewallFormFields";
import { Control } from "react-hook-form";
import { LegacyFormData } from "../forms/component-forms/ComponentValidationSchemas";

interface Props {
  control: Control<LegacyFormData>;
}

export const RouterFirewallFields: React.FC<Props> = ({ control }) => (
  <RouterFirewallFormFields register={{ control: control as never }} />
);
