import { describe, it, expect } from "vitest";
import {
  findCompatibleTransceiverTemplate,
  isTransceiverCompatible,
  findCommonTransceiverMedia,
  getTransceiverForConnection,
} from "./TransceiverManager";
import {
  Port,
  PortSpeed,
  MediaType,
  ConnectorType,
  ComponentType,
} from "@/types/infrastructure";
import { Transceiver } from "@/types/infrastructure/transceiver-types";

const makePort = (overrides: Partial<Port> = {}): Port => ({
  id: "p",
  connectorType: ConnectorType.QSFP,
  speed: PortSpeed.Speed100G,
  ...overrides,
});

const makeTransceiver = (overrides: Partial<Transceiver> = {}): Transceiver => ({
  id: "t",
  type: ComponentType.Transceiver,
  name: "t",
  manufacturer: "",
  model: "",
  cost: 0,
  connectorType: ConnectorType.QSFP,
  mediaConnectorType: ConnectorType.LC,
  speed: PortSpeed.Speed100G,
  mediaTypeSupported: [MediaType.FiberMM],
  maxDistanceMeters: 100,
  ...overrides,
});

describe("isTransceiverCompatible", () => {
  const port = makePort();

  it("accepts on connector + speed + supported media", () => {
    expect(isTransceiverCompatible(makeTransceiver(), port, MediaType.FiberMM)).toBe(true);
  });

  it("rejects mismatched connector", () => {
    const t = makeTransceiver({ connectorType: ConnectorType.SFP });
    expect(isTransceiverCompatible(t, port, MediaType.FiberMM)).toBe(false);
  });

  it("rejects mismatched speed", () => {
    const t = makeTransceiver({ speed: PortSpeed.Speed25G });
    expect(isTransceiverCompatible(t, port, MediaType.FiberMM)).toBe(false);
  });

  it("rejects unsupported media", () => {
    expect(isTransceiverCompatible(makeTransceiver(), port, MediaType.FiberSM)).toBe(false);
  });

  it("honors breakout-compatible flag", () => {
    const t = makeTransceiver({ breakoutCompatible: false });
    expect(isTransceiverCompatible(t, port, MediaType.FiberMM, true)).toBe(false);
    const bk = makeTransceiver({ breakoutCompatible: true });
    expect(isTransceiverCompatible(bk, port, MediaType.FiberMM, true)).toBe(true);
  });
});

describe("findCompatibleTransceiverTemplate", () => {
  it("returns the first match", () => {
    const templates = [
      makeTransceiver({ id: "a" }),
      makeTransceiver({ id: "b" }),
    ];
    expect(findCompatibleTransceiverTemplate(templates, makePort(), MediaType.FiberMM)?.id).toBe("a");
  });

  it("returns undefined when nothing matches", () => {
    const templates = [makeTransceiver({ speed: PortSpeed.Speed25G })];
    expect(findCompatibleTransceiverTemplate(templates, makePort(), MediaType.FiberMM)).toBeUndefined();
  });

  it("filters on breakout flag", () => {
    const templates = [
      makeTransceiver({ id: "plain", breakoutCompatible: false }),
      makeTransceiver({ id: "bk", breakoutCompatible: true }),
    ];
    expect(
      findCompatibleTransceiverTemplate(templates, makePort(), MediaType.FiberMM, true)?.id,
    ).toBe("bk");
  });
});

describe("getTransceiverForConnection", () => {
  it("delegates to findCompatibleTransceiverTemplate", () => {
    const templates = [makeTransceiver({ id: "only" })];
    expect(getTransceiverForConnection(templates, makePort(), MediaType.FiberMM)?.id).toBe("only");
  });
});

describe("findCommonTransceiverMedia", () => {
  it("picks FiberMM when both sides support it", () => {
    const templates = [
      makeTransceiver({ id: "mm-src", connectorType: ConnectorType.SFP, speed: PortSpeed.Speed10G, mediaTypeSupported: [MediaType.FiberMM, MediaType.FiberSM] }),
      makeTransceiver({ id: "mm-dst", connectorType: ConnectorType.QSFP, speed: PortSpeed.Speed100G, mediaTypeSupported: [MediaType.FiberMM] }),
    ];
    const src = makePort({ connectorType: ConnectorType.SFP, speed: PortSpeed.Speed10G });
    const dst = makePort({ connectorType: ConnectorType.QSFP, speed: PortSpeed.Speed100G });
    const result = findCommonTransceiverMedia(src, dst, templates);
    expect(result.commonMediaType).toBe(MediaType.FiberMM);
    expect(result.srcTransceiver?.id).toBe("mm-src");
    expect(result.dstTransceiver?.id).toBe("mm-dst");
  });

  it("falls back to FiberSM when MM not on both sides", () => {
    const templates = [
      makeTransceiver({ id: "sm-src", connectorType: ConnectorType.SFP, speed: PortSpeed.Speed10G, mediaTypeSupported: [MediaType.FiberSM] }),
      makeTransceiver({ id: "sm-dst", connectorType: ConnectorType.QSFP, speed: PortSpeed.Speed100G, mediaTypeSupported: [MediaType.FiberSM] }),
    ];
    const src = makePort({ connectorType: ConnectorType.SFP, speed: PortSpeed.Speed10G });
    const dst = makePort({ connectorType: ConnectorType.QSFP, speed: PortSpeed.Speed100G });
    const result = findCommonTransceiverMedia(src, dst, templates);
    expect(result.commonMediaType).toBe(MediaType.FiberSM);
  });

  it("returns empty object when no common media", () => {
    const templates = [
      makeTransceiver({ id: "mm-src", connectorType: ConnectorType.SFP, speed: PortSpeed.Speed10G, mediaTypeSupported: [MediaType.FiberMM] }),
      makeTransceiver({ id: "sm-dst", connectorType: ConnectorType.QSFP, speed: PortSpeed.Speed100G, mediaTypeSupported: [MediaType.FiberSM] }),
    ];
    const src = makePort({ connectorType: ConnectorType.SFP, speed: PortSpeed.Speed10G });
    const dst = makePort({ connectorType: ConnectorType.QSFP, speed: PortSpeed.Speed100G });
    expect(findCommonTransceiverMedia(src, dst, templates)).toEqual({});
  });
});
