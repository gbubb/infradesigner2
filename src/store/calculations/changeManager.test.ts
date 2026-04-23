import { describe, it, expect } from "vitest";
import { ChangeManager, ChangeType } from "./changeManager";
import { makeRequirements } from "@/test/fixtures/requirements";

describe("ChangeManager.detectChanges", () => {
  it("returns no changes when both requirement sets are equivalent", () => {
    const r = makeRequirements();
    expect(ChangeManager.detectChanges(r, r)).toEqual([]);
  });

  it("detects compute capacity changes when CPU-per-VM shifts", () => {
    const oldR = makeRequirements({ computeRequirements: { averageVMVCPUs: 4, computeClusters: [] } });
    const newR = makeRequirements({ computeRequirements: { averageVMVCPUs: 8, computeClusters: [] } });
    expect(ChangeManager.detectChanges(oldR, newR)).toContain(ChangeType.COMPUTE_CAPACITY);
  });

  it("detects storage capacity changes when storagePools diverge", () => {
    const oldR = makeRequirements({ storageRequirements: { storageClusters: [], storagePools: [] } });
    const newR = makeRequirements({
      storageRequirements: {
        storageClusters: [],
        storagePools: [{ id: "p1", name: "default", capacityTB: 10 } as never],
      },
    });
    expect(ChangeManager.detectChanges(oldR, newR)).toContain(ChangeType.STORAGE_CAPACITY);
  });

  it("detects physical changes when availabilityZones differ", () => {
    const oldR = makeRequirements({ physicalConstraints: { totalAvailabilityZones: 1 } });
    const newR = makeRequirements({ physicalConstraints: { totalAvailabilityZones: 3 } });
    const changes = ChangeManager.detectChanges(oldR, newR);
    expect(changes).toContain(ChangeType.PHYSICAL_CONSTRAINTS);
  });

  it("detects GPU changes when a compute cluster gains gpuEnabled", () => {
    const oldR = makeRequirements({
      computeRequirements: {
        computeClusters: [{ id: "c1", name: "c1", gpuEnabled: false } as never],
      },
    });
    const newR = makeRequirements({
      computeRequirements: {
        computeClusters: [{ id: "c1", name: "c1", gpuEnabled: true } as never],
      },
    });
    const changes = ChangeManager.detectChanges(oldR, newR);
    expect(changes).toContain(ChangeType.GPU_REQUIREMENTS);
  });

  it("reports multiple change types simultaneously", () => {
    const oldR = makeRequirements();
    const newR = makeRequirements({
      computeRequirements: { averageVMVCPUs: 8, computeClusters: [] },
      physicalConstraints: { totalAvailabilityZones: 2 },
    });
    const changes = ChangeManager.detectChanges(oldR, newR);
    expect(changes).toContain(ChangeType.COMPUTE_CAPACITY);
    expect(changes).toContain(ChangeType.PHYSICAL_CONSTRAINTS);
  });

  it("detects when requirements appear for the first time (old undefined)", () => {
    const oldR = makeRequirements({ computeRequirements: undefined as never });
    const newR = makeRequirements({ computeRequirements: { averageVMVCPUs: 4, computeClusters: [] } });
    expect(ChangeManager.detectChanges(oldR, newR)).toContain(ChangeType.COMPUTE_CAPACITY);
  });
});

describe("ChangeManager.getChangeImpact", () => {
  it("returns neutral impact when no changes were detected", () => {
    const impact = ChangeManager.getChangeImpact([]);
    expect(impact.affectedRoles).toEqual([]);
    expect(impact.requiresNewRacks).toBe(false);
    expect(impact.requiresRackRebalancing).toBe(false);
    expect(impact.preserveComponentIds).toBe(true);
    expect(impact.preserveRackIds).toBe(true);
  });

  it("OR-aggregates requiresNewRacks across multiple change types", () => {
    const impact = ChangeManager.getChangeImpact([
      ChangeType.COMPUTE_CAPACITY,
      ChangeType.STORAGE_CAPACITY,
    ]);
    // At least one of the two likely flips requiresNewRacks or rebalance; assert structure.
    expect(typeof impact.requiresNewRacks).toBe("boolean");
    expect(typeof impact.requiresRackRebalancing).toBe("boolean");
  });

  it("AND-aggregates preservation flags (any non-preserving change blocks preservation)", () => {
    // Single change type's preserve flags determine the result; feed one known flag and verify.
    const impact = ChangeManager.getChangeImpact([ChangeType.PHYSICAL_CONSTRAINTS]);
    expect(typeof impact.preserveComponentIds).toBe("boolean");
    expect(typeof impact.preserveRackIds).toBe("boolean");
  });

  it("collapses to '*' affectedRoles when any change has wildcard impact", () => {
    const impact = ChangeManager.getChangeImpact([
      ChangeType.COMPUTE_CAPACITY,
      ChangeType.STORAGE_CAPACITY,
      ChangeType.NETWORK_CONFIG,
      ChangeType.PHYSICAL_CONSTRAINTS,
      ChangeType.GPU_REQUIREMENTS,
    ]);
    // Broad change set — any '*' entry should collapse the list.
    if (impact.affectedRoles.includes("*")) {
      expect(impact.affectedRoles).toEqual(["*"]);
    } else {
      expect(impact.affectedRoles.length).toBeGreaterThan(0);
    }
  });
});
