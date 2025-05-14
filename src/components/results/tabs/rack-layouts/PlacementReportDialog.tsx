import React from "react";
import {
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
  <AlertDialogContent className="max-w-[1100px] w-full max-h-[80vh] overflow-y-auto relative">
    <button
      className="absolute top-4 right-4 text-lg text-gray-500 hover:text-gray-800 rounded transition"
      onClick={() => onOpenChange(false)}
      aria-label="Close placement report"
    >
      &times;
    </button>
    <AlertDialogHeader>
      <AlertDialogTitle>Device Placement Report</AlertDialogTitle>
      <AlertDialogDescription className="space-y-4">
        {placementReport && (
          <>
            <div className="text-sm font-medium">
              <div className="mb-2">
                <span className="mr-2">Total devices processed:</span>
                <span className="font-bold">{placementReport.totalDevices}</span>
              </div>
              <div className="mb-2">
                <span className="mr-2">Successfully placed:</span>
                <span className="text-green-600 font-bold">
                  {placementReport.placedDevices}
                </span>
              </div>
              <div>
                <span className="mr-2">Failed to place:</span>
                <span className="text-red-600 font-bold">
                  {placementReport.failedDevices}
                </span>
              </div>
            </div>

            {placementReport.items.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Component Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Generated Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {placementReport.items.map((item, index) => (
                      <tr
                        key={index}
                        className={item.status === "failed" ? "bg-red-50" : ""}
                      >
                        <td className="px-4 py-2 text-sm">{item.deviceName}</td>
                        <td className="px-4 py-2 text-sm">{item.instanceName}</td>
                        <td className="px-4 py-2 text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === "placed"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.status === "placed" ? "Placed" : "Failed"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {item.status === "placed" ? (
                            <span>
                              AZ: {azNameMap[item.azId ?? ""] || item.azId} | Rack:{" "}
                              {rackNameMap[item.rackId ?? ""] || item.rackId} | Position:{" "}
                              {item.ruPosition}
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
            )}
          </>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Close</AlertDialogCancel>
    </AlertDialogFooter>
  </AlertDialogContent>
);
