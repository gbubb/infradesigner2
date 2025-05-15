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
}) => {
  // Diagnostic logs at the start of the component function
  console.log('[PlacementReportDialog] Received props:', { open, placementReport, azNameMap, rackNameMap });

  if (placementReport) {
    console.log('[PlacementReportDialog] placementReport.items?.length:', placementReport.items?.length);
  } else {
    console.log('[PlacementReportDialog] placementReport is null or undefined at start');
  }

  // Diagnostic log for AlertDialogDescription content decision
  console.log('[PlacementReportDialog] Preparing AlertDialogDescription, placementReport:', placementReport);

  // Diagnostic log for main content conditional decision
  console.log('[PlacementReportDialog] Before main content conditional, placementReport:', placementReport);

  return (
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
            {!placementReport && (
              <span className="text-sm text-muted-foreground">Generating placement report...</span>
            )}
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
        {!placementReport ? (
          <div className="flex items-center justify-center min-h-[180px] pb-6">
            <svg className="animate-spin h-8 w-8 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <span className="text-lg text-muted-foreground">Processing auto-placement...</span>
          </div>
        ) : (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">Simple Test Content</h3>
            <p>If you see this, the dialog is receiving the report data.</p>
            <p>Report has {placementReport.items?.length || 'N/A'} items.</p>
            <p>AZ Map has {Object.keys(azNameMap || {}).length} entries.</p>
            <p>Rack Map has {Object.keys(rackNameMap || {}).length} entries.</p>
          </div>
        )}
        <AlertDialogFooter className="px-6">
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
