import { describe, it, expect } from "vitest";
import {
  estimateCableLength,
  estimateCableLengthWithBreakdown,
  getCableTemplate,
  findCompatibleCableTemplate,
  findCompatibleBreakoutCableTemplate,
  DEFAULT_CABLE_DISTANCE_SETTINGS,
} from "./CableManager";
import {
  PlacedDevice,
  RackProfile,
  RowLayoutConfiguration,
  Cable,
  ComponentType,
  ConnectorType,
  CableMediaType,
  PortSpeed,
  DeviceOrientation,
} from "@/types/infrastructure";

const makePlaced = (overrides: Partial<PlacedDevice> = {}): PlacedDevice => ({
  deviceId: "d",
  ruPosition: 10,
  orientation: DeviceOrientation.Front,
  ...overrides,
});

const makeRack = (overrides: Partial<RackProfile> = {}): RackProfile => ({
  id: "r1",
  name: "R1",
  uHeight: 42,
  devices: [],
  ...overrides,
});

const makeCable = (overrides: Partial<Cable> = {}): Cable => ({
  id: "c",
  type: ComponentType.Cable,
  name: "cable",
  manufacturer: "",
  model: "",
  cost: 0,
  length: 3,
  connectorA_Type: ConnectorType.SFP,
  connectorB_Type: ConnectorType.SFP,
  mediaType: CableMediaType.FiberMMDuplex,
  ...overrides,
});

describe("estimateCableLengthWithBreakdown", () => {
  it("returns default when placement is missing", () => {
    const b = estimateCableLengthWithBreakdown(
      { deviceId: "a", ruPosition: NaN as unknown as number, orientation: DeviceOrientation.Front },
      undefined,
      undefined,
      undefined,
      undefined,
    );
    expect(b.totalMeters).toBe(DEFAULT_CABLE_DISTANCE_SETTINGS.defaultInterRackLengthM);
    expect(b.sameRack).toBe(false);
  });

  it("same-rack same-orientation: vertical + slack + intraRack routing", () => {
    const rack = makeRack();
    const b = estimateCableLengthWithBreakdown(
      makePlaced({ deviceId: "a", ruPosition: 10 }),
      rack,
      makePlaced({ deviceId: "b", ruPosition: 15 }),
      rack,
    );
    const expectedMm =
      5 * DEFAULT_CABLE_DISTANCE_SETTINGS.ruHeightMm +
      2 * DEFAULT_CABLE_DISTANCE_SETTINGS.slackPerEndMm +
      DEFAULT_CABLE_DISTANCE_SETTINGS.intraRackRoutingMm;
    expect(b.sameRack).toBe(true);
    expect(b.totalMillimeters).toBeCloseTo(expectedMm);
    expect(b.totalMeters).toBeCloseTo(expectedMm / 1000);
    expect(b.components.orientationAdjustmentMm).toBe(0);
  });

  it("same-rack different orientation adds rack-depth routing", () => {
    const rack = makeRack();
    const b = estimateCableLengthWithBreakdown(
      makePlaced({ deviceId: "a", ruPosition: 10, orientation: DeviceOrientation.Front }),
      rack,
      makePlaced({ deviceId: "b", ruPosition: 10, orientation: DeviceOrientation.Rear }),
      rack,
    );
    expect(b.components.orientationAdjustmentMm).toBe(DEFAULT_CABLE_DISTANCE_SETTINGS.rackDepthMm);
  });

  it("inter-rack uses row layout horizontal + traversal + slack", () => {
    const rackA = makeRack({ id: "ra" });
    const rackB = makeRack({ id: "rb" });
    const rowLayout: RowLayoutConfiguration = {
      id: "row",
      name: "row",
      cableHeightMm: 500,
      rackOrder: ["ra", "rb"],
      rackProperties: {
        ra: { id: "ra", friendlyName: "RA", widthMm: 600, gapAfterMm: 100 },
        rb: { id: "rb", friendlyName: "RB", widthMm: 600, gapAfterMm: 0 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const b = estimateCableLengthWithBreakdown(
      makePlaced({ deviceId: "a", ruPosition: 5 }),
      rackA,
      makePlaced({ deviceId: "b", ruPosition: 5 }),
      rackB,
      rowLayout,
    );
    expect(b.sameRack).toBe(false);
    // Horizontal: ra width (600) only — gapAfterMm only added between intermediate racks (i < endIdx-1)
    expect(b.components.horizontalDistanceMm).toBe(600);
    // Vertical traversal: 2 * (cableHeightMm + ruPos * ruHeight) = 2 * (500 + 5*44.5) = 2*722.5 = 1445
    expect(b.components.cableHeightTraversalMm).toBeCloseTo(2 * (500 + 5 * 44.5));
    expect(b.components.slackAllowanceMm).toBe(2 * DEFAULT_CABLE_DISTANCE_SETTINGS.slackPerEndMm);
  });

  it("falls back to default when rack not in row layout", () => {
    const rackA = makeRack({ id: "ra" });
    const rackB = makeRack({ id: "rb" });
    const rowLayout: RowLayoutConfiguration = {
      id: "row",
      name: "row",
      cableHeightMm: 500,
      rackOrder: ["ra"], // rb missing
      rackProperties: {
        ra: { id: "ra", friendlyName: "RA", widthMm: 600, gapAfterMm: 0 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const b = estimateCableLengthWithBreakdown(
      makePlaced({ deviceId: "a", ruPosition: 5 }),
      rackA,
      makePlaced({ deviceId: "b", ruPosition: 5 }),
      rackB,
      rowLayout,
    );
    expect(b.totalMeters).toBe(DEFAULT_CABLE_DISTANCE_SETTINGS.defaultInterRackLengthM);
  });
});

describe("estimateCableLength", () => {
  it("returns totalMeters from breakdown", () => {
    const rack = makeRack();
    const placed = makePlaced({ ruPosition: 10 });
    const length = estimateCableLength(placed, rack, placed, rack);
    // Same device/same rack/same RU: 0 vertical + 2*slack + intraRack
    const expected =
      (2 * DEFAULT_CABLE_DISTANCE_SETTINGS.slackPerEndMm +
        DEFAULT_CABLE_DISTANCE_SETTINGS.intraRackRoutingMm) /
      1000;
    expect(length).toBeCloseTo(expected);
  });
});

describe("getCableTemplate", () => {
  const key = [ConnectorType.SFP, ConnectorType.SFP].sort().join(":");
  const cables: Cable[] = [
    makeCable({ id: "short", length: 1, mediaType: CableMediaType.FiberMMDuplex }),
    makeCable({ id: "mid", length: 5, mediaType: CableMediaType.FiberMMDuplex }),
    makeCable({ id: "wrongMedia", length: 3, mediaType: CableMediaType.FiberSMDuplex }),
  ];
  const lookup = new Map<string, Cable[]>([[key, cables]]);

  it("returns shortest cable meeting length requirement", () => {
    const c = getCableTemplate(lookup, ConnectorType.SFP, ConnectorType.SFP, CableMediaType.FiberMMDuplex, 2);
    expect(c?.id).toBe("mid");
  });

  it("returns first match when no length requirement", () => {
    const c = getCableTemplate(lookup, ConnectorType.SFP, ConnectorType.SFP, CableMediaType.FiberMMDuplex);
    expect(c?.id).toBe("short");
  });

  it("returns undefined for missing lookup key", () => {
    expect(
      getCableTemplate(lookup, ConnectorType.QSFP, ConnectorType.QSFP, CableMediaType.FiberMMDuplex),
    ).toBeUndefined();
  });

  it("filters out wrong media type", () => {
    const c = getCableTemplate(lookup, ConnectorType.SFP, ConnectorType.SFP, CableMediaType.FiberSMDuplex);
    expect(c?.id).toBe("wrongMedia");
  });
});

describe("findCompatibleCableTemplate", () => {
  const cables: Cable[] = [
    makeCable({
      id: "dac1",
      length: 1,
      connectorA_Type: ConnectorType.SFP,
      connectorB_Type: ConnectorType.SFP,
      mediaType: CableMediaType.DACSFP,
      speed: PortSpeed.Speed25G,
    }),
    makeCable({
      id: "dac3",
      length: 3,
      connectorA_Type: ConnectorType.SFP,
      connectorB_Type: ConnectorType.SFP,
      mediaType: CableMediaType.DACSFP,
      speed: PortSpeed.Speed25G,
    }),
    makeCable({
      id: "reversed",
      length: 2,
      connectorA_Type: ConnectorType.QSFP,
      connectorB_Type: ConnectorType.SFP,
      mediaType: CableMediaType.DACSFP,
      speed: PortSpeed.Speed25G,
    }),
  ];
  // CableManager uses flat(values) so the lookup key doesn't matter for this function
  const lookup = new Map<string, Cable[]>([["any", cables]]);

  it("finds shortest cable meeting length requirement", () => {
    const c = findCompatibleCableTemplate(
      lookup,
      ConnectorType.SFP,
      ConnectorType.SFP,
      CableMediaType.DACSFP,
      PortSpeed.Speed25G,
      2,
    );
    expect(c?.id).toBe("dac3");
  });

  it("treats connector A/B pair as unordered", () => {
    const c = findCompatibleCableTemplate(
      lookup,
      ConnectorType.SFP,
      ConnectorType.QSFP,
      CableMediaType.DACSFP,
      PortSpeed.Speed25G,
    );
    expect(c?.id).toBe("reversed");
  });

  it("returns undefined when speed does not match", () => {
    expect(
      findCompatibleCableTemplate(
        lookup,
        ConnectorType.SFP,
        ConnectorType.SFP,
        CableMediaType.DACSFP,
        PortSpeed.Speed100G,
      ),
    ).toBeUndefined();
  });
});

describe("findCompatibleBreakoutCableTemplate", () => {
  const cables: Cable[] = [
    makeCable({
      id: "bk1",
      isBreakout: true,
      connectorA_Type: ConnectorType.QSFP,
      connectorB_Type: ConnectorType.SFP,
      mediaType: CableMediaType.DACQSFP,
      speed: PortSpeed.Speed100G,
    }),
    makeCable({
      id: "not-breakout",
      isBreakout: false,
      connectorA_Type: ConnectorType.QSFP,
      connectorB_Type: ConnectorType.SFP,
      mediaType: CableMediaType.DACQSFP,
      speed: PortSpeed.Speed100G,
    }),
    makeCable({
      id: "wrong-media",
      isBreakout: true,
      connectorA_Type: ConnectorType.QSFP,
      connectorB_Type: ConnectorType.SFP,
      mediaType: CableMediaType.FiberMMDuplex,
      speed: PortSpeed.Speed100G,
    }),
  ];

  it("finds matching breakout cable", () => {
    const c = findCompatibleBreakoutCableTemplate(
      cables,
      ConnectorType.SFP,
      ConnectorType.QSFP,
      PortSpeed.Speed25G,
      PortSpeed.Speed100G,
      CableMediaType.DACQSFP,
    );
    expect(c?.id).toBe("bk1");
  });

  it("excludes non-breakout cables", () => {
    // remove bk1 (the match) — should fall through, not pick "not-breakout"
    const withoutMatch = cables.filter((c) => c.id !== "bk1");
    expect(
      findCompatibleBreakoutCableTemplate(
        withoutMatch,
        ConnectorType.SFP,
        ConnectorType.QSFP,
        PortSpeed.Speed25G,
        PortSpeed.Speed100G,
        CableMediaType.DACQSFP,
      ),
    ).toBeUndefined();
  });
});
