import { RackProfile, RackType } from "@/types/infrastructure/rack-types";

let id = 0;
const nextId = () => `rack-${++id}`;

export const makeRack = (overrides: Partial<RackProfile> = {}): RackProfile => ({
  id: nextId(),
  name: "Test Rack",
  uHeight: 42,
  devices: [],
  rackType: RackType.ComputeStorage,
  ...overrides,
});
