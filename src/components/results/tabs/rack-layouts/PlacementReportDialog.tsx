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
      <AlertDialogContent 
        style={{ 
          backgroundColor: 'red', 
          minWidth: '300px', 
          minHeight: '200px', 
          padding: '20px',
          zIndex: 9999, // Force high z-index
        }}
      >
        <button
          className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 z-[10000] text-2xl bg-white p-1 rounded"
          style={{ lineHeight: 1, border: "none", cursor: "pointer" }}
          onClick={() => onOpenChange(false)}
          aria-label="Close"
        >
          ×
        </button>
        
        <div style={{ color: 'white', fontSize: '16px' }}>
          <h3 className="text-lg font-semibold mb-2">Dialog Content Test Area</h3>
          {placementReport ? (
            <p>Report IS present. Items: {placementReport.items?.length || 'N/A'}</p>
          ) : (
            <p>Report is NOT present. Showing loading/spinner content normally.</p>
          )}
          <p>If you see this red box with white text, the issue is likely with the original classes or more complex children.</p>
          <p>If not, the AlertDialogContent itself is not rendering its children visibly.</p>
        </div>

      </AlertDialogContent>
    </AlertDialog>
  );
};
