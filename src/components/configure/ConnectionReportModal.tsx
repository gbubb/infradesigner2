import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const statusColors: Record<string, string> = {
  "Success": "bg-green-500 text-white",
  "Failed": "bg-red-500 text-white",
  "Skipped": "bg-yellow-400 text-black",
  "Info": "bg-blue-500 text-white"
}

interface Props {
  open: boolean;
  onClose: () => void;
  report: ConnectionAttempt[];
}

function filterConnectionAttempts(rows: ConnectionAttempt[], q: string): ConnectionAttempt[] {
  if (!q) return rows;
  const lowerQ = q.toLowerCase();
  return rows.filter(row =>
    Object.values(row).some(val =>
      val && typeof val === "string" && val.toLowerCase().includes(lowerQ)
    ) || (row.ruleName && row.ruleName.toLowerCase().includes(lowerQ))
  );
}

const ConnectionReportModal: React.FC<Props> = ({ open, onClose, report }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState<keyof ConnectionAttempt | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const summary = useMemo(() => {
    if (!report) return { total: 0, successful: 0, failed: 0, skipped: 0 };
    const successful = report.filter(r => r.status === "Success").length;
    const failed = report.filter(r => r.status === "Failed").length;
    const skipped = report.filter(r => r.status === "Skipped").length;
    return { total: report.length, successful, failed, skipped };
  }, [report]);

  const displayedReport = useMemo(() => {
    const filtered = filterConnectionAttempts(report || [], searchQuery);
    if (sortCol) {
      filtered.sort((a, b) => {
        const aval = a[sortCol] ?? "";
        const bval = b[sortCol] ?? "";
        if (aval === bval) return 0;
        if (sortDir === "asc") return String(aval).localeCompare(String(bval));
        return String(bval).localeCompare(String(aval));
      });
    }
    return filtered;
  }, [report, searchQuery, sortCol, sortDir]);

  const handleSort = (col: keyof ConnectionAttempt) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };
  
  useEffect(() => {
    setSearchQuery("");
    setSortCol(null);
    setSortDir("asc");
  }, [report]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Connection Generation Report</DialogTitle>
          <DialogDescription>
            <span>
              Total attempts: <span className="font-bold">{summary.total}</span>
              {" | "}
              Successful: <span className="text-green-600 font-bold">{summary.successful}</span>
              {" | "}
              Failed: <span className="text-red-600 font-bold">{summary.failed}</span>
              {" | "}
              Skipped: <span className="text-yellow-600 font-bold">{summary.skipped}</span>
            </span>
            <br/>
            This report lists every attempt made to generate a network connection, including reasons for skips and failures.
          </DialogDescription>
        </DialogHeader>
        <div className="my-2">
          <Input
            type="text"
            placeholder="Filter report..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full sm:w-72"
          />
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort("status")} className="cursor-pointer select-none">
                  Status {sortCol === "status" && (sortDir === "asc" ? "▲" : "▼")}
                </TableHead>
                <TableHead onClick={() => handleSort("ruleName")} className="cursor-pointer select-none">
                  Rule {sortCol === "ruleName" && (sortDir === "asc" ? "▲" : "▼")}
                </TableHead>
                <TableHead onClick={() => handleSort("sourceDeviceName")} className="cursor-pointer select-none">
                  Source Device {sortCol === "sourceDeviceName" && (sortDir === "asc" ? "▲" : "▼")}
                </TableHead>
                <TableHead onClick={() => handleSort("sourcePortId")} className="cursor-pointer select-none">
                  Source Port {sortCol === "sourcePortId" && (sortDir === "asc" ? "▲" : "▼")}
                </TableHead>
                <TableHead onClick={() => handleSort("targetDeviceName")} className="cursor-pointer select-none">
                  Target Device {sortCol === "targetDeviceName" && (sortDir === "asc" ? "▲" : "▼")}
                </TableHead>
                <TableHead onClick={() => handleSort("targetPortId")} className="cursor-pointer select-none">
                  Target Port {sortCol === "targetPortId" && (sortDir === "asc" ? "▲" : "▼")}
                </TableHead>
                <TableHead onClick={() => handleSort("reason")} className="cursor-pointer select-none">
                  Reason / Details {sortCol === "reason" && (sortDir === "asc" ? "▲" : "▼")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedReport.map((a, i) => (
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
                  <TableCell>
                    {a.status === "Info" && a.reason?.includes("⚠️") ? (
                      <div className="font-medium text-amber-600">{a.reason}</div>
                    ) : (
                      a.reason
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {displayedReport.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    No connection attempts recorded {searchQuery ? "for your filter" : ""}.
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
};

export default ConnectionReportModal;
