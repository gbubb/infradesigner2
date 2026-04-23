import { ComponentType, InfrastructureComponent } from "@/types/infrastructure";

let id = 0;
const nextId = () => `component-${++id}`;

export const makeComponent = (
  overrides: Partial<InfrastructureComponent> = {}
): InfrastructureComponent => ({
  id: nextId(),
  type: ComponentType.Server,
  name: "Test Component",
  manufacturer: "Test Inc",
  model: "T-1000",
  cost: 1000,
  ruSize: 1,
  ...overrides,
});
