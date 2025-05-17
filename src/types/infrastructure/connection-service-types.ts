
import { NetworkConnection } from "./connection-types";

/**
 * Represents an attempt to generate a network connection,
 * providing detailed debug info for both success and failure.
 */
export type ConnectionAttempt = {
  ruleId?: string;
  ruleName?: string;
  sourceDeviceName?: string;
  sourceDeviceId?: string;
  sourcePortId?: string;
  targetDeviceName?: string;
  targetDeviceId?: string;
  targetPortId?: string;
  status: "Success" | "Failed" | "Skipped" | "Info";
  reason: string;
  connection?: NetworkConnection;
};
