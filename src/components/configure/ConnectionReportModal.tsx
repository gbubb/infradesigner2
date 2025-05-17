
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const statusColors: Record<string, string> = {
  "Success": "bg-green-500 text-white",
  "Failed": "bg-red-500 text-white",
  "Skipped": "bg-yellow-400 text-black",
  "Info": "bg-gray-200 text-black"
}

interface Props {
  open: boolean;
  onClose: () => void;
  report: ConnectionAttempt[];
}

const ConnectionReportModal: React.FC<Props> = ({ open, onClose, report }) => (
  <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
    <DialogContent className="max-w-5xl">
      <DialogHeader>
        <DialogTitle>Connection Generation Report</DialogTitle>
        <DialogDescription>
          This report lists every attempt made to generate a network connection, including reasons for skips and failures.
        </DialogDescription>
      </DialogHeader>
      <div className="overflow-auto max-h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Source Device</TableHead>
              <TableHead>Source Port</TableHead>
              <TableHead>Target Device</TableHead>
              <TableHead>Target Port</TableHead>
              <TableHead>Reason / Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.map((a, i) => (
              <TableRow key={i}>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[a.status] || ""}`}>{a.status}</span>
                </TableCell>
                <TableCell>
                  {(a.ruleName || a.ruleId || "-")}
                </TableCell>
                <TableCell>
                  {a.sourceDeviceName || a.sourceDeviceId || "-"}
                </TableCell>
                <TableCell>
                  {a.sourcePortId || "-"}
                </TableCell>
                <TableCell>
                  {a.targetDeviceName || a.targetDeviceId || "-"}
                </TableCell>
                <TableCell>
                  {a.targetPortId || "-"}
                </TableCell>
                <TableCell>{a.reason}</TableCell>
              </TableRow>
            ))}
            {report.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  No connection attempts recorded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="w-full flex justify-end mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/80 transition"
        >Close</button>
      </div>
    </DialogContent>
  </Dialog>
);

export default ConnectionReportModal;
