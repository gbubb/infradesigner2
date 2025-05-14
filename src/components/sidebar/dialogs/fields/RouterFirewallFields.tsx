
import React from "react";
import { RouterFirewallFormFields } from "../../forms/RouterFirewallFormFields";

interface Props {
  control: any;
}

export const RouterFirewallFields: React.FC<Props> = ({ control }) => (
  <RouterFirewallFormFields register={{ control }} />
);
