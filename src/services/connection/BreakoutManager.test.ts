import { describe, it, expect } from "vitest";
import {
  getBreakoutTargetSpeed,
  areDevicesWithinBreakoutDistance,
  isBreakoutCable,
  validateBreakoutCompatibility,
  getBreakoutMaxDistance,
  createBreakoutGroup,
  addSourceToBreakoutGroup,
} from "./BreakoutManager";
import {
  PortSpeed,
  ConnectorType,
  CableMediaType,
  ComponentType,
  Port,
  Cable,
  PortRole,
} from "@/types/infrastructure";

const makePort = (overrides: Partial<Port> = {}): Port => ({
  id: "p1",
  connectorType: ConnectorType.QSFP,
  speed: PortSpeed.Speed100G,
  role: PortRole.Uplink,
  ...overrides,
});

const makeCable = (overrides: Partial<Cable> = {}): Cable => ({
  id: "c1",
  type: ComponentType.Cable,
  name: "cable",
  manufacturer: "",
  model: "",
  cost: 0,
  length: 3,
  connectorA_Type: ConnectorType.QSFP,
  connectorB_Type: ConnectorType.SFP,
  mediaType: CableMediaType.DACQSFP,
  ...overrides,
});

describe("getBreakoutTargetSpeed", () => {
  it("maps 25G → 100G", () => {
    expect(getBreakoutTargetSpeed(PortSpeed.Speed25G)).toBe(PortSpeed.Speed100G);
  });

  it("maps 100G → 400G", () => {
    expect(getBreakoutTargetSpeed(PortSpeed.Speed100G)).toBe(PortSpeed.Speed400G);
  });

  it("returns undefined for non-breakout speeds", () => {
    expect(getBreakoutTargetSpeed(PortSpeed.Speed1G)).toBeUndefined();
    expect(getBreakoutTargetSpeed(PortSpeed.Speed10G)).toBeUndefined();
    expect(getBreakoutTargetSpeed(PortSpeed.Speed40G)).toBeUndefined();
    expect(getBreakoutTargetSpeed(PortSpeed.Speed400G)).toBeUndefined();
  });
});

describe("areDevicesWithinBreakoutDistance", () => {
  it("allows devices within 8 RU", () => {
    expect(areDevicesWithinBreakoutDistance(10, 12)).toBe(true);
    expect(areDevicesWithinBreakoutDistance(10, 18)).toBe(true);
    expect(areDevicesWithinBreakoutDistance(18, 10)).toBe(true);
  });

  it("rejects devices beyond 8 RU", () => {
    expect(areDevicesWithinBreakoutDistance(10, 19)).toBe(false);
    expect(areDevicesWithinBreakoutDistance(1, 42)).toBe(false);
  });

  it("allows devices at exactly the same RU", () => {
    expect(areDevicesWithinBreakoutDistance(5, 5)).toBe(true);
  });
});

describe("isBreakoutCable", () => {
  it("returns true when flagged", () => {
    expect(isBreakoutCable(makeCable({ isBreakout: true }))).toBe(true);
  });

  it("returns false when unflagged or false", () => {
    expect(isBreakoutCable(makeCable({ isBreakout: false }))).toBe(false);
    expect(isBreakoutCable(makeCable({}))).toBe(false);
  });
});

describe("getBreakoutMaxDistance", () => {
  it("returns 5m for 400G", () => {
    expect(getBreakoutMaxDistance(PortSpeed.Speed400G)).toBe(5);
  });

  it("returns 5m for 100G", () => {
    expect(getBreakoutMaxDistance(PortSpeed.Speed100G)).toBe(5);
  });

  it("falls back to 5m for other speeds", () => {
    expect(getBreakoutMaxDistance(PortSpeed.Speed25G)).toBe(5);
    expect(getBreakoutMaxDistance(PortSpeed.Speed10G)).toBe(5);
  });
});

describe("validateBreakoutCompatibility", () => {
  it("accepts 100G source → 400G target with matching cable", () => {
    const src = makePort({ speed: PortSpeed.Speed100G });
    const tgt = makePort({ speed: PortSpeed.Speed400G });
    const cable = makeCable({ isBreakout: true, speed: PortSpeed.Speed400G });
    expect(validateBreakoutCompatibility(src, tgt, cable)).toBe(true);
  });

  it("accepts cable with no speed (generic) when port speeds align", () => {
    const src = makePort({ speed: PortSpeed.Speed25G });
    const tgt = makePort({ speed: PortSpeed.Speed100G });
    const cable = makeCable({ isBreakout: true, speed: undefined });
    expect(validateBreakoutCompatibility(src, tgt, cable)).toBe(true);
  });

  it("rejects non-breakout cable", () => {
    const src = makePort({ speed: PortSpeed.Speed25G });
    const tgt = makePort({ speed: PortSpeed.Speed100G });
    const cable = makeCable({ isBreakout: false });
    expect(validateBreakoutCompatibility(src, tgt, cable)).toBe(false);
  });

  it("rejects when source speed has no breakout mapping", () => {
    const src = makePort({ speed: PortSpeed.Speed1G });
    const tgt = makePort({ speed: PortSpeed.Speed10G });
    const cable = makeCable({ isBreakout: true });
    expect(validateBreakoutCompatibility(src, tgt, cable)).toBe(false);
  });

  it("rejects when target speed does not match expected mapping", () => {
    const src = makePort({ speed: PortSpeed.Speed25G });
    const tgt = makePort({ speed: PortSpeed.Speed400G }); // should be 100G for 25G source
    const cable = makeCable({ isBreakout: true });
    expect(validateBreakoutCompatibility(src, tgt, cable)).toBe(false);
  });

  it("rejects when cable speed disagrees with target port", () => {
    const src = makePort({ speed: PortSpeed.Speed25G });
    const tgt = makePort({ speed: PortSpeed.Speed100G });
    const cable = makeCable({ isBreakout: true, speed: PortSpeed.Speed400G });
    expect(validateBreakoutCompatibility(src, tgt, cable)).toBe(false);
  });
});

describe("breakout group helpers", () => {
  it("createBreakoutGroup seeds empty sourceConnections", () => {
    const group = createBreakoutGroup("dev-1", "port-a", "0001");
    expect(group).toEqual({
      targetDeviceId: "dev-1",
      targetPortId: "port-a",
      cableId: "0001",
      sourceConnections: [],
    });
  });

  it("addSourceToBreakoutGroup mutates the group", () => {
    const group = createBreakoutGroup("dev-1", "port-a", "0001");
    addSourceToBreakoutGroup(group, "dev-2", "port-b", 12);
    expect(group.sourceConnections).toEqual([
      { sourceDeviceId: "dev-2", sourcePortId: "port-b", ruPosition: 12 },
    ]);
  });
});
