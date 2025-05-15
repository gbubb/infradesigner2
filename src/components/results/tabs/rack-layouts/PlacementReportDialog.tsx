
import React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { PlacementReport } from "@/services/automatedPlacementService";

interface PlacementReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placementReport: PlacementReport | null;
  azNameMap: Record<string, string>;
  rackNameMap: Record<string, string>;
}

export const PlacementReportDialog: React.FC<PlacementReportDialogProps> = ({
  open,
  onOpenChange,
  placementReport,
  azNameMap,
  rackNameMap,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="max-w-[700px] w-[700px] max-h-[80vh] overflow-y-auto relative px-0">
      <button
        className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 z-10 text-2xl"
        style={{ lineHeight: 1, background: "transparent", border: "none", cursor: "pointer" }}
        onClick={() => onOpenChange(false)}
        aria-label="Close"
      >
        ×
      </button>
      <AlertDialogHeader className="px-6">
        <AlertDialogTitle>Device Placement Report</AlertDialogTitle>
        <AlertDialogDescription>
          {placementReport && (
            <span>
              Total devices processed:{" "}
              <span className="font-bold">{placementReport.totalDevices}</span>
              {" | "}
              Successfully placed:{" "}
              <span className="text-green-600 font-bold">{placementReport.placedDevices}</span>
              {" | "}
              Failed to place:{" "}
              <span className="text-red-600 font-bold">{placementReport.failedDevices}</span>
            </span>
          )}
        </AlertDialogDescription>
      </AlertDialogHeader>
      {placementReport && (
        <div className="space-y-4 px-6 pb-3">
          <div className="border rounded-md overflow-hidden w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {placementReport.items.map((item, index) => (
                  <tr key={index} className={item.status === "failed" ? "bg-red-50" : ""}>
                    <td className="px-4 py-2 text-sm">{item.deviceName}</td>
                    <td className="px-4 py-2 text-sm">{item.instanceName}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === "placed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.status === "placed" ? "Placed" : "Failed"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {item.status === "placed" ? (
                        <span>
                          AZ: {azNameMap[item.azId ?? ""] || item.azId} | Rack: {rackNameMap[item.rackId ?? ""] || item.rackId} | Position: {item.ruPosition}
                        </span>
                      ) : (
                        <span className="text-red-600">{item.reason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AlertDialogFooter className="px-6">
        <AlertDialogCancel>Close</AlertDialogCancel>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
