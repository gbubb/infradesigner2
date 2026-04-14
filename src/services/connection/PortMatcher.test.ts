import { describe, it, expect } from "vitest";
import {
  filterPorts,
  matchesPortRole,
  findAvailablePorts,
  groupPortsByRole,
  groupPortsBySpeed,
  sortPortsByName,
  findBestMatchingPort,
  filterDevicesByCriteria,
  getDeviceName,
} from "./PortMatcher";
import {
  Port,
  PortRole,
  PortSpeed,
  ConnectorType,
  InfrastructureComponent,
  ComponentType,
} from "@/types/infrastructure";

const makePort = (overrides: Partial<Port> = {}): Port => ({
  id: "p",
  connectorType: ConnectorType.QSFP,
  speed: PortSpeed.Speed100G,
  ...overrides,
});

const makeDevice = (
  overrides: Partial<InfrastructureComponent> = {},
): InfrastructureComponent => ({
  id: "dev-1",
  type: ComponentType.Switch,
  name: "sw-1",
  manufacturer: "acme",
  model: "x",
  cost: 0,
  ports: [],
  ...overrides,
});

describe("matchesPortRole", () => {
  it("accepts when no criteria", () => {
    expect(matchesPortRole(PortRole.Data, undefined)).toBe(true);
    expect(matchesPortRole(PortRole.Data, [])).toBe(true);
    expect(matchesPortRole(undefined, undefined)).toBe(true);
  });

  it("rejects when criteria provided but port has no role", () => {
    expect(matchesPortRole(undefined, [PortRole.Data])).toBe(false);
  });

  it("matches on inclusion", () => {
    expect(matchesPortRole(PortRole.Uplink, [PortRole.Uplink, PortRole.Data])).toBe(true);
    expect(matchesPortRole(PortRole.Management, [PortRole.Uplink])).toBe(false);
  });
});

describe("filterPorts", () => {
  const device = makeDevice({
    ports: [
      makePort({ id: "p1", role: PortRole.Uplink, speed: PortSpeed.Speed100G, name: "eth1" }),
      makePort({ id: "p2", role: PortRole.Data, speed: PortSpeed.Speed25G, name: "eth2" }),
      makePort({ id: "p3", role: PortRole.Management, speed: PortSpeed.Speed1G, name: "mgmt0" }),
    ],
  });

  it("returns all ports when criteria is undefined", () => {
    expect(filterPorts(device, undefined)).toHaveLength(3);
  });

  it("filters by portRole", () => {
    const ports = filterPorts(device, { portRole: [PortRole.Uplink] });
    expect(ports.map((p) => p.id)).toEqual(["p1"]);
  });

  it("filters by speed", () => {
    const ports = filterPorts(device, { speed: PortSpeed.Speed25G });
    expect(ports.map((p) => p.id)).toEqual(["p2"]);
  });

  it("filters by name pattern", () => {
    const ports = filterPorts(device, { portNamePattern: "^mgmt" });
    expect(ports.map((p) => p.id)).toEqual(["p3"]);
  });

  it("excludes explicitly listed port IDs", () => {
    const ports = filterPorts(device, { excludePorts: ["p1", "p3"] });
    expect(ports.map((p) => p.id)).toEqual(["p2"]);
  });

  it("in breakout target mode, remaps criteria speed → target speed", () => {
    // criteria speed 25G means target ports must be 100G
    const d = makeDevice({
      ports: [
        makePort({ id: "p1", speed: PortSpeed.Speed25G }),
        makePort({ id: "p2", speed: PortSpeed.Speed100G }),
      ],
    });
    const ports = filterPorts(d, { speed: PortSpeed.Speed25G }, true, true);
    expect(ports.map((p) => p.id)).toEqual(["p2"]);
  });

  it("returns empty ports array when device has none", () => {
    expect(filterPorts(makeDevice({ ports: [] }), { speed: PortSpeed.Speed100G })).toEqual([]);
  });
});

describe("findAvailablePorts", () => {
  const device = makeDevice({
    ports: [
      makePort({ id: "p1" }),
      makePort({ id: "p2", connectedToDeviceId: "other" }),
      makePort({ id: "p3" }),
    ],
  });

  it("excludes connected ports", () => {
    expect(findAvailablePorts(device).map((p) => p.id)).toEqual(["p1", "p3"]);
  });

  it("excludes ports already tracked as used", () => {
    const used = new Set<string>(["dev-1:p1"]);
    expect(findAvailablePorts(device, undefined, used).map((p) => p.id)).toEqual(["p3"]);
  });
});

describe("groupPortsByRole", () => {
  it("groups ports by role, skips roleless ports", () => {
    const ports = [
      makePort({ id: "p1", role: PortRole.Data }),
      makePort({ id: "p2", role: PortRole.Data }),
      makePort({ id: "p3", role: PortRole.Uplink }),
      makePort({ id: "p4" }), // no role
    ];
    const grouped = groupPortsByRole(ports);
    expect(grouped[PortRole.Data].map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(grouped[PortRole.Uplink].map((p) => p.id)).toEqual(["p3"]);
    expect(grouped[PortRole.Management]).toBeUndefined();
  });
});

describe("groupPortsBySpeed", () => {
  it("groups and tags roleless/speedless ports as 'unknown'", () => {
    const ports = [
      makePort({ id: "p1", speed: PortSpeed.Speed100G }),
      makePort({ id: "p2", speed: PortSpeed.Speed25G }),
      makePort({ id: "p3", speed: PortSpeed.Speed100G }),
    ];
    const grouped = groupPortsBySpeed(ports);
    expect(grouped[PortSpeed.Speed100G].map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(grouped[PortSpeed.Speed25G].map((p) => p.id)).toEqual(["p2"]);
  });
});

describe("sortPortsByName", () => {
  it("applies natural sort", () => {
    const ports = [
      makePort({ id: "a", name: "eth10" }),
      makePort({ id: "b", name: "eth2" }),
      makePort({ id: "c", name: "eth1" }),
    ];
    expect(sortPortsByName(ports).map((p) => p.name)).toEqual(["eth1", "eth2", "eth10"]);
  });

  it("does not mutate input", () => {
    const ports = [makePort({ name: "b" }), makePort({ name: "a" })];
    sortPortsByName(ports);
    expect(ports.map((p) => p.name)).toEqual(["b", "a"]);
  });
});

describe("findBestMatchingPort", () => {
  it("returns undefined for empty list", () => {
    expect(findBestMatchingPort([])).toBeUndefined();
  });

  it("prefers role match (score 3) over speed/name", () => {
    const ports = [
      makePort({ id: "a", role: PortRole.Data, speed: PortSpeed.Speed100G, name: "eth1" }),
      makePort({ id: "b", role: PortRole.Uplink, speed: PortSpeed.Speed100G, name: "eth1" }),
    ];
    expect(findBestMatchingPort(ports, PortRole.Uplink, PortSpeed.Speed100G, "eth")?.id).toBe("b");
  });
});

describe("filterDevicesByCriteria", () => {
  const devices = [
    makeDevice({ id: "a", type: ComponentType.Server, role: "compute" }),
    makeDevice({ id: "b", type: ComponentType.Switch, role: "leaf" }),
    makeDevice({ id: "c", type: ComponentType.Switch, role: "spine" }),
  ];

  it("filters by type", () => {
    expect(filterDevicesByCriteria(devices, undefined, ComponentType.Switch).map((d) => d.id)).toEqual(["b", "c"]);
  });

  it("filters by role", () => {
    expect(filterDevicesByCriteria(devices, "leaf").map((d) => d.id)).toEqual(["b"]);
  });

  it("returns all when no criteria", () => {
    expect(filterDevicesByCriteria(devices)).toHaveLength(3);
  });
});

describe("getDeviceName", () => {
  it("returns device name when found", () => {
    const devices = [makeDevice({ id: "abc123", name: "sw-core" })];
    expect(getDeviceName(devices, "abc123")).toBe("sw-core");
  });

  it("falls back to id prefix when not found", () => {
    expect(getDeviceName([], "abc123def")).toBe("abc123");
  });
});
