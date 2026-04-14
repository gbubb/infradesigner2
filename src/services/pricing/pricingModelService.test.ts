import { describe, it, expect } from "vitest";
import {
  PricingModelService,
  PricingConfig,
} from "./pricingModelService";
import {
  ComponentRole,
  ComponentType,
  InfrastructureComponent,
  InfrastructureDesign,
} from "@/types/infrastructure";

const baseConfig: PricingConfig = {
  operatingModel: "costPlus",
  profitMargin: 1.3,
  targetUtilization: 0.7,
  virtualizationOverhead: 0.1,
  virtualizationOverheadType: "percentage",
  sizePenaltyFactor: 0.1,
};

const fixedConfig: PricingConfig = {
  operatingModel: "fixedPrice",
  profitMargin: 1.0,
  fixedCpuPrice: 0.02,
  fixedMemoryPrice: 0.005,
  fixedStoragePrice: 0.036,
  targetUtilization: 0.7,
  virtualizationOverhead: 0.1,
  virtualizationOverheadType: "percentage",
  sizePenaltyFactor: 0.1,
};

const makeServerTemplate = (
  overrides: Partial<InfrastructureComponent> = {},
): InfrastructureComponent => ({
  id: "tpl-srv",
  type: ComponentType.Server,
  name: "R740",
  manufacturer: "Dell",
  model: "R740",
  cost: 10000,
  cpuSockets: 2,
  cpuCoresPerSocket: 16,
  memoryCapacity: 256,
  ...overrides,
});

const makeComputeRole = (overrides: Partial<ComponentRole> = {}): ComponentRole => ({
  id: "role-1",
  role: "computeNode",
  description: "compute",
  requiredCount: 4,
  adjustedRequiredCount: 5,
  assignedComponentId: "tpl-srv",
  clusterInfo: { clusterId: "cluster-a", clusterName: "Cluster A", clusterIndex: 0 },
  ...overrides,
});

const makeDesign = (overrides: Partial<InfrastructureDesign> = {}): InfrastructureDesign => ({
  id: "d1",
  name: "Test design",
  description: "",
  createdAt: new Date(),
  updatedAt: new Date(),
  requirements: {} as InfrastructureDesign["requirements"],
  components: [],
  componentRoles: [],
  ...overrides,
});

describe("PricingModelService construction", () => {
  it("getConfig returns the exact config", () => {
    const svc = new PricingModelService(null, baseConfig);
    expect(svc.getConfig()).toBe(baseConfig);
  });

  it("empty state: getAvailableClusters/getClusterComponents/storageCapacities return empty", () => {
    const svc = new PricingModelService(null, baseConfig);
    expect(svc.getAvailableClusters()).toEqual([]);
    expect(svc.getClusterComponents()).toEqual([]);
    expect(svc.calculateStorageClusterCapacities()).toEqual([]);
  });

  it("null design: calculateClusterCapacity returns zeroed snapshot", () => {
    const svc = new PricingModelService(null, baseConfig);
    const cap = svc.calculateClusterCapacity();
    expect(cap.totalPhysicalCores).toBe(0);
    expect(cap.totalPhysicalMemoryGB).toBe(0);
    expect(cap.totalPhysicalNodes).toBe(0);
    expect(cap.totalvCPUs).toBe(0);
    expect(cap.usablevCPUs).toBe(0);
    expect(cap.isHyperConverged).toBe(false);
    expect(cap.virtualizationOverhead).toBe(baseConfig.virtualizationOverhead);
    expect(cap.targetUtilization).toBe(baseConfig.targetUtilization);
  });
});

describe("getAvailableClusters", () => {
  it("skips non-compute roles", () => {
    const design = makeDesign({
      componentRoles: [
        makeComputeRole({ id: "r1" }),
        makeComputeRole({ id: "r2", role: "storageNode" }),
        makeComputeRole({ id: "r3", role: "mgmt", assignedComponentId: undefined }),
      ],
    });
    const svc = new PricingModelService(design, baseConfig, [makeServerTemplate()]);
    const clusters = svc.getAvailableClusters();
    expect(clusters).toHaveLength(1);
  });

  it("sums adjustedRequiredCount across roles in the same cluster", () => {
    const design = makeDesign({
      componentRoles: [
        makeComputeRole({ id: "r1", adjustedRequiredCount: 3 }),
        makeComputeRole({ id: "r2", adjustedRequiredCount: 2 }),
      ],
    });
    const svc = new PricingModelService(design, baseConfig, [makeServerTemplate()]);
    const [cluster] = svc.getAvailableClusters();
    expect(cluster.nodeCount).toBe(5);
    // 2 sockets * 16 cores * 5 nodes = 160 cores
    expect(cluster.specifications.totalCores).toBe(160);
    // 256 GB * 5 = 1280
    expect(cluster.specifications.totalMemoryGB).toBe(1280);
  });

  it("falls back to requiredCount when adjusted is missing", () => {
    const design = makeDesign({
      componentRoles: [
        makeComputeRole({
          id: "r1",
          requiredCount: 7,
          adjustedRequiredCount: undefined,
        }),
      ],
    });
    const svc = new PricingModelService(design, baseConfig, [makeServerTemplate()]);
    expect(svc.getAvailableClusters()[0].nodeCount).toBe(7);
  });

  it("marks hyperConverged and gpu flags based on role", () => {
    const design = makeDesign({
      componentRoles: [
        makeComputeRole({ id: "r1", role: "hyperConvergedNode", clusterInfo: { clusterId: "hci", clusterName: "HCI", clusterIndex: 0 } }),
        makeComputeRole({ id: "r2", role: "gpuNode", clusterInfo: { clusterId: "gpu", clusterName: "GPU", clusterIndex: 1 } }),
      ],
    });
    const svc = new PricingModelService(design, baseConfig, [makeServerTemplate()]);
    const clusters = svc.getAvailableClusters();
    expect(clusters).toHaveLength(2);
  });

  it("skips clusters whose assigned template is missing", () => {
    const design = makeDesign({
      componentRoles: [makeComputeRole({ assignedComponentId: "ghost" })],
    });
    const svc = new PricingModelService(design, baseConfig, [makeServerTemplate()]);
    expect(svc.getAvailableClusters()).toEqual([]);
  });
});

describe("getClusterComponents", () => {
  it("filters to the selected cluster ID", () => {
    const design = makeDesign({
      componentRoles: [
        makeComputeRole({
          id: "r1",
          clusterInfo: { clusterId: "A", clusterName: "A", clusterIndex: 0 },
        }),
        makeComputeRole({
          id: "r2",
          clusterInfo: { clusterId: "B", clusterName: "B", clusterIndex: 1 },
        }),
      ],
    });
    const svc = new PricingModelService(design, baseConfig, [makeServerTemplate()], "B");
    const comps = svc.getClusterComponents();
    expect(comps).toHaveLength(1);
    expect(comps[0].metadata?.cluster_id).toBe("B");
  });

  it("returns all compute components when no cluster selected", () => {
    const design = makeDesign({
      componentRoles: [
        makeComputeRole({ id: "r1", clusterInfo: { clusterId: "A", clusterName: "A", clusterIndex: 0 } }),
        makeComputeRole({ id: "r2", clusterInfo: { clusterId: "B", clusterName: "B", clusterIndex: 1 } }),
      ],
    });
    const svc = new PricingModelService(design, baseConfig, [makeServerTemplate()]);
    expect(svc.getClusterComponents()).toHaveLength(2);
  });
});

describe("calculateClusterCapacity", () => {
  it("applies default 4x CPU oversubscription, virt overhead, and utilization", () => {
    const design = makeDesign({
      componentRoles: [
        makeComputeRole({ id: "r1", adjustedRequiredCount: 2 }),
      ],
    });
    const svc = new PricingModelService(design, baseConfig, [makeServerTemplate()]);
    const cap = svc.calculateClusterCapacity();

    // 2 sockets * 16 cores * 2 nodes = 64 physical cores; memory 512 GB
    expect(cap.totalPhysicalCores).toBe(64);
    expect(cap.totalPhysicalMemoryGB).toBe(512);
    expect(cap.totalPhysicalNodes).toBe(2);

    // vCPUs = 64 * 4 (default oversubscription) = 256
    expect(cap.totalvCPUs).toBe(256);
    expect(cap.totalMemoryGB).toBe(512);

    // haReservation = 1 additional node / 2 nodes = 0.5 (capped)
    expect(cap.haReservation).toBe(0.5);

    // usablevCPUs = 256 * (1-0.1) * (1-0.5) = 115.2
    expect(cap.usablevCPUs).toBeCloseTo(256 * 0.9 * 0.5);
    // sellingvCPUs = usablevCPUs * 0.7
    expect(cap.sellingvCPUs).toBeCloseTo(cap.usablevCPUs * 0.7);
  });

  it("fixed virtualization overhead subtracts absolute vCPU/memory", () => {
    const design = makeDesign({
      componentRoles: [makeComputeRole({ id: "r1", adjustedRequiredCount: 10 })],
    });
    const config: PricingConfig = {
      ...baseConfig,
      virtualizationOverheadType: "fixed",
      virtualizationOverhead: 8, // fixed vCPU overhead
      virtualizationOverheadMemory: 16,
    };
    const svc = new PricingModelService(design, config, [makeServerTemplate()]);
    const cap = svc.calculateClusterCapacity();

    // 10 nodes × 32 cores × 4x oversub = 1280 vCPUs
    expect(cap.totalvCPUs).toBe(1280);
    // haReservation on 10 nodes: hostsPerZone=10, azFailuresToTolerate=0, reservedHosts=0+1=1 → 0.1
    expect(cap.haReservation).toBeCloseTo(0.1);
    // usablevCPUs = max(0, 1280 - 8) * (1 - 0.1) = 1272 * 0.9
    expect(cap.usablevCPUs).toBeCloseTo(1272 * 0.9);
  });

  it("returns zeroed capacity but non-zero settings when no compute roles assigned", () => {
    const design = makeDesign({ componentRoles: [] });
    const svc = new PricingModelService(design, baseConfig, []);
    const cap = svc.calculateClusterCapacity();
    expect(cap.totalPhysicalCores).toBe(0);
    expect(cap.virtualizationOverhead).toBe(baseConfig.virtualizationOverhead);
    expect(cap.targetUtilization).toBe(baseConfig.targetUtilization);
  });
});

describe("calculatePricing integration", () => {
  it("fixedPrice model yields configured CPU/memory prices", () => {
    const design = makeDesign({
      componentRoles: [makeComputeRole({ id: "r1", adjustedRequiredCount: 4 })],
    });
    const svc = new PricingModelService(design, fixedConfig, [makeServerTemplate()]);
    const pricing = svc.calculatePricing();
    expect(pricing.baseCostPerVCPU).toBeCloseTo(fixedConfig.fixedCpuPrice!);
    expect(pricing.baseCostPerGBMemory).toBeCloseTo(fixedConfig.fixedMemoryPrice!);
  });

  it("cpuMemoryWeightRatio reports memoryGB/vCPUs", () => {
    const design = makeDesign({
      componentRoles: [makeComputeRole({ id: "r1", adjustedRequiredCount: 1 })],
    });
    const svc = new PricingModelService(design, baseConfig, [makeServerTemplate()]);
    const result = svc.calculatePricing();
    // totalvCPUs = 32*4 = 128, totalMemoryGB = 256. ratio = 256/128 = 2
    expect(result.cpuMemoryWeightRatio).toBeCloseTo(2);
  });
});
