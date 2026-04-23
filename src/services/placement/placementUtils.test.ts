import { describe, it, expect } from "vitest";
import {
  getTypeKey,
  isCoreNet,
  isPatchPanel,
  isComputeLike,
  getCoreAndComputeRacks,
} from "./placementUtils";
import { ComponentType } from "@/types/infrastructure";
import { RackType } from "@/types/infrastructure/rack-types";
import { makeComponent } from "@/test/fixtures/component";
import { makeRack } from "@/test/fixtures/rack";

describe("getTypeKey", () => {
  it("prefers namingPrefix when present", () => {
    const c = makeComponent({ namingPrefix: "SRV", type: ComponentType.Server, role: "leafSwitch" });
    expect(getTypeKey(c)).toBe("srv");
  });

  it("falls back to typePrefix when namingPrefix is missing", () => {
    const c = makeComponent({ namingPrefix: undefined, typePrefix: "SW", type: ComponentType.Switch });
    expect(getTypeKey(c)).toBe("sw");
  });

  it("falls back to type when neither prefix is set", () => {
    const c = makeComponent({ namingPrefix: undefined, typePrefix: undefined, type: ComponentType.Switch });
    expect(getTypeKey(c)).toBe("switch");
  });

  it("falls back to role (lowercased) when type is also empty-like", () => {
    // ts-expect-error: deliberately bypass enum for the fallback branch
    const c = makeComponent({ namingPrefix: undefined, typePrefix: undefined, type: "" as ComponentType, role: "leafSwitch" });
    expect(getTypeKey(c)).toBe("leafswitch");
  });

  it("returns 'unknown' for undefined component", () => {
    expect(getTypeKey(undefined)).toBe("unknown");
  });

  it("returns 'unknown' when no identifying fields are set", () => {
    // ts-expect-error: deliberately bypass enum for the fallback branch
    const c = makeComponent({ namingPrefix: undefined, typePrefix: undefined, type: "" as ComponentType, role: undefined });
    expect(getTypeKey(c)).toBe("unknown");
  });
});

describe("isCoreNet", () => {
  it.each([
    ["firewall type", { type: ComponentType.Firewall, role: "firewall" }, true],
    ["router type", { type: ComponentType.Router, role: "router" }, true],
    ["spine switch by role", { type: ComponentType.Switch, role: "spineSwitch" }, true],
    ["border leaf by role", { type: ComponentType.Switch, role: "borderLeafSwitch" }, true],
    ["server is not core", { type: ComponentType.Server, role: "computeNode" }, false],
    ["disk is not core", { type: ComponentType.Disk, role: "" }, false],
  ])("%s", (_, overrides, expected) => {
    expect(isCoreNet(makeComponent(overrides))).toBe(expected);
  });
});

describe("isPatchPanel", () => {
  it("matches fiber patch panel by namingPrefix", () => {
    expect(isPatchPanel(makeComponent({ namingPrefix: "FiberPatchPanel" }))).toBe(true);
  });

  it("matches copper patch panel by namingPrefix", () => {
    expect(isPatchPanel(makeComponent({ namingPrefix: "CopperPatchPanel" }))).toBe(true);
  });

  it("does not match a server", () => {
    expect(isPatchPanel(makeComponent({ namingPrefix: "SRV", type: ComponentType.Server }))).toBe(false);
  });
});

describe("isComputeLike", () => {
  it("matches compute/controller/storage/hyperconverged/ipmi/leaf", () => {
    for (const role of ["controller", "compute", "storage", "hyperConverged", "ipmiSwitch", "leafSwitch"]) {
      expect(isComputeLike(makeComponent({ role }))).toBe(true);
    }
  });

  it("does not match firewall or cable", () => {
    expect(isComputeLike(makeComponent({ namingPrefix: "FW", role: "firewall", type: ComponentType.Firewall }))).toBe(false);
    expect(isComputeLike(makeComponent({ namingPrefix: "CBL", role: "", type: ComponentType.Cable }))).toBe(false);
  });
});

describe("getCoreAndComputeRacks", () => {
  it("partitions rack profiles by rackType", () => {
    const core1 = makeRack({ rackType: RackType.Core, name: "Core-1" });
    const core2 = makeRack({ rackType: RackType.Core, name: "Core-2" });
    const compute1 = makeRack({ rackType: RackType.ComputeStorage, name: "Compute-1" });
    const compute2 = makeRack({ rackType: RackType.ComputeStorage, name: "Compute-2" });

    const { coreRacks, computeRacks } = getCoreAndComputeRacks([core1, compute1, core2, compute2]);

    expect(coreRacks).toHaveLength(2);
    expect(coreRacks.map(r => r.name)).toEqual(["Core-1", "Core-2"]);
    expect(computeRacks).toHaveLength(2);
    expect(computeRacks.map(r => r.name)).toEqual(["Compute-1", "Compute-2"]);
  });

  it("returns empty arrays when no racks of a given type exist", () => {
    const only = makeRack({ rackType: RackType.Core });
    const { coreRacks, computeRacks } = getCoreAndComputeRacks([only]);
    expect(coreRacks).toHaveLength(1);
    expect(computeRacks).toHaveLength(0);
  });
});
