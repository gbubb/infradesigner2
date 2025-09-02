import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useDesignStore } from "@/store/designStore";
import { generateConnections } from "@/services/connectionService";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Plus, Network, Download, Cable, Settings } from "lucide-react";
import { InfrastructureDesign, NetworkConnection, RackProfile, InfrastructureComponent, ComponentType, Cable as CableType, Port, Transceiver } from "@/types/infrastructure";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";
import ConnectionReportModal from "./ConnectionReportModal";
import ManualConnectionDialog from "./ManualConnectionDialog";
import { CableDistanceSettingsDialog } from "./CableDistanceSettingsDialog";
import { CableDistanceTooltip } from "./CableDistanceTooltip";
import { RowLayoutConfiguration, DeviceOrientation } from "@/types/infrastructure/rack-types";
import { estimateCableLengthWithBreakdown, CableDistanceSettings, DEFAULT_CABLE_DISTANCE_SETTINGS } from "@/services/connection/CableManager";

// Table display row type for formatted data
type NetworkConnectionTableRow = {
  id: string;
  connectionId: string;
  sourceDeviceId: string;
  sourcePortId: string;
  srcRack: string;
  srcRU: string | number;
  destinationDeviceId: string;
  destinationPortId: string;
  dstRack: string;
  dstRU: string | number;
  cableType: string;
  calculatedDistanceMm: string | number;
  lengthMeters: string | number;
  transceiverSourceModel: string;
  transceiverDestinationModel: string;
  status: string;
  notes?: string;
};

// Utility for searching/filtering table rows
function filterConnections(rows: NetworkConnectionTableRow[], q: string) {
  if (!q) return rows;
  const lowerQ = q.toLowerCase();
  return rows.filter(row =>
    Object.values(row).some(val =>
      val && typeof val === "string" && val.toLowerCase().includes(lowerQ)
    )
  );
}

const getDeviceName = (list: InfrastructureComponent[], id: string): string => {
  return list.find(d => d.id === id)?.name || id.substring(0, 6);
};

const getPortName = (
  deviceId: string, 
  portId: string, 
  allDesignComponents: InfrastructureComponent[]
): string => {
  const device = allDesignComponents.find(c => c.id === deviceId);
  if (device && device.ports) {
    const port = device.ports.find(p => p.id === portId);
    return port?.name || portId.substring(0, 6);
  }
  return portId.substring(0, 6);
};

const getRackAndRU = (
  rackprofiles: RackProfile[] | undefined, 
  deviceId: string, 
  rowLayoutProperties?: Record<string, { friendlyName: string }> | null
) => {
  if (!rackprofiles) return { rack: "-", ru: "-", rackId: null };
  for (const rack of rackprofiles) {
    for (const d of rack.devices) {
      if (d.deviceId === deviceId) {
        // Use Row Layout friendly name as the authoritative source
        const rackName = rowLayoutProperties?.[rack.id]?.friendlyName || rack.name || rack.id.substring(0, 6);
        return { rack: rackName, ru: d.ruPosition ?? "-", rackId: rack.id };
      }
    }
  }
  return { rack: "-", ru: "-", rackId: null };
};

const calculateCableDistance = (
  srcRackId: string | null,
  srcRU: string | number,
  dstRackId: string | null,
  dstRU: string | number,
  rowLayout?: RowLayoutConfiguration,
  racks?: RackProfile[],
  srcOrientation: DeviceOrientation = DeviceOrientation.Front,
  dstOrientation: DeviceOrientation = DeviceOrientation.Front,
  settings: CableDistanceSettings = DEFAULT_CABLE_DISTANCE_SETTINGS
): { distanceMm: number; breakdown: any } => {
  if (!srcRackId || !dstRackId || !racks) {
    return { distanceMm: settings.defaultInterRackLengthM * 1000, breakdown: null };
  }

  const srcRUNum = typeof srcRU === 'number' ? srcRU : 0;
  const dstRUNum = typeof dstRU === 'number' ? dstRU : 0;

  // Find the racks
  const srcRack = racks.find(r => r.id === srcRackId);
  const dstRack = racks.find(r => r.id === dstRackId);

  // Create PlacedDevice objects for the calculation
  const srcPlaced = {
    deviceId: '',
    ruPosition: srcRUNum,
    orientation: srcOrientation
  };
  const dstPlaced = {
    deviceId: '',
    ruPosition: dstRUNum,
    orientation: dstOrientation
  };

  // Use the unified cable length calculation
  const breakdown = estimateCableLengthWithBreakdown(
    srcPlaced,
    srcRack,
    dstPlaced,
    dstRack,
    rowLayout,
    settings
  );

  return { 
    distanceMm: breakdown.totalMillimeters, 
    breakdown 
  };
};

const columns = [
  { key: 'connectionId', label: 'Connection ID' },
  { key: 'sourceDeviceId', label: 'Source Device' },
  { key: 'sourcePortId', label: 'Source Port' },
  { key: 'srcRack', label: 'Source Rack' },
  { key: 'srcRU', label: 'Source RU' },
  { key: 'destinationDeviceId', label: 'Destination Device' },
  { key: 'destinationPortId', label: 'Destination Port' },
  { key: 'dstRack', label: 'Destination Rack' },
  { key: 'dstRU', label: 'Destination RU' },
  { key: 'cableType', label: 'Cable Type' },
  { key: 'calculatedDistanceMm', label: 'Calculated Distance (mm)' },
  { key: 'lengthMeters', label: 'Selected Cable (m)' },
  { key: 'transceiverSourceModel', label: 'Src Transceiver' },
  { key: 'transceiverDestinationModel', label: 'Dst Transceiver' }
];

const formatConnectionRow = (
  row: NetworkConnection,
  allDesignComponents: InfrastructureComponent[],
  racks: RackProfile[] | undefined,
  allTransceiverTemplates: Transceiver[],
  rowLayoutProperties?: Record<string, { friendlyName: string }> | null,
  rowLayout?: RowLayoutConfiguration,
  cableDistanceSettings?: CableDistanceSettings
): NetworkConnectionTableRow => {
  const srcDeviceName = getDeviceName(allDesignComponents, row.sourceDeviceId);
  const dstDeviceName = getDeviceName(allDesignComponents, row.destinationDeviceId);
  
  const srcPortName = getPortName(row.sourceDeviceId, row.sourcePortId, allDesignComponents);
  const dstPortName = getPortName(row.destinationDeviceId, row.destinationPortId, allDesignComponents);

  const srcRackObj = getRackAndRU(racks, row.sourceDeviceId, rowLayoutProperties);
  const dstRackObj = getRackAndRU(racks, row.destinationDeviceId, rowLayoutProperties);
  
  // Get device orientations from rack placement
  const srcDevice = srcRackObj.rackId && racks.find(r => r.id === srcRackObj.rackId)
    ?.devices.find(d => d.deviceId === row.sourceDeviceId);
  const dstDevice = dstRackObj.rackId && racks.find(r => r.id === dstRackObj.rackId)
    ?.devices.find(d => d.deviceId === row.destinationDeviceId);

  // Calculate cable distance with the unified function
  const { distanceMm, breakdown } = calculateCableDistance(
    srcRackObj.rackId,
    srcRackObj.ru,
    dstRackObj.rackId,
    dstRackObj.ru,
    rowLayout,
    racks,
    srcDevice?.orientation || DeviceOrientation.Front,
    dstDevice?.orientation || DeviceOrientation.Front,
    cableDistanceSettings || DEFAULT_CABLE_DISTANCE_SETTINGS
  );
  
  // Get transceiver names from IDs
  const srcTransceiverName = row.transceiverSourceId 
    ? allTransceiverTemplates.find(t => t.id === row.transceiverSourceId)?.name || "-"
    : "-";
  const dstTransceiverName = row.transceiverDestinationId
    ? allTransceiverTemplates.find(t => t.id === row.transceiverDestinationId)?.name || "-"
    : "-";
  
  return {
    id: row.id,
    connectionId: row.connectionId || "-",
    sourceDeviceId: srcDeviceName,
    sourcePortId: srcPortName,
    srcRack: srcRackObj.rack,
    srcRU: srcRackObj.ru,
    destinationDeviceId: dstDeviceName,
    destinationPortId: dstPortName,
    dstRack: dstRackObj.rack,
    dstRU: dstRackObj.ru,
    cableType: row.mediaType || "-",
    calculatedDistanceMm: distanceMm.toFixed(0),
    distanceBreakdown: breakdown,
    lengthMeters: typeof row.lengthMeters === "number" && !isNaN(row.lengthMeters) ? row.lengthMeters.toFixed(1) : "-",
    transceiverSourceModel: srcTransceiverName,
    transceiverDestinationModel: dstTransceiverName,
    status: row.status,
    notes: row.notes,
  };
};

const NetworkConnectionsTab: React.FC = () => {
  const { activeDesign, updateDesign, componentTemplates, cableDistanceSettings } = useDesignStore();
  const [generating, setGenerating] = useState(false);
  const [networkConnections, setNetworkConnections] = useState<NetworkConnection[]>(activeDesign?.networkConnections || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState<string>("sourceDeviceId");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [generationReport, setGenerationReport] = useState<ConnectionAttempt[] | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const displayedRows = useMemo(() => {
    const designComponents = activeDesign?.components || [];
    const allTransceiverTemplates = componentTemplates.filter(
      (c): c is Transceiver => c.type === ComponentType.Transceiver
    );
    const rows: NetworkConnectionTableRow[] = (networkConnections || []).map(r =>
      formatConnectionRow(r, designComponents, activeDesign?.rackprofiles, allTransceiverTemplates, activeDesign?.rowLayout?.rackProperties, activeDesign?.rowLayout, cableDistanceSettings)
    );
    const filtered = filterConnections(rows, searchQuery);

    if (sortCol) {
      filtered.sort((a, b) => {
        const aval = a[sortCol as keyof NetworkConnectionTableRow] ?? "";
        const bval = b[sortCol as keyof NetworkConnectionTableRow] ?? "";
        if (aval === bval) return 0;
        if (sortDir === "asc") return aval < bval ? -1 : 1;
        return aval > bval ? -1 : 1;
      });
    }
    return filtered;
  }, [networkConnections, searchQuery, sortCol, sortDir, activeDesign, componentTemplates]);

  const handleGenerate = () => {
    if (!activeDesign) return;
    
    // Check for unplaced devices
    const allDevices = activeDesign.components?.filter((c: InfrastructureComponent) =>
      [ComponentType.Server, ComponentType.Switch, ComponentType.Router, ComponentType.Firewall].includes(c.type)
    ) || [];
    
    const placedDeviceIds = new Set<string>();
    if (activeDesign.rackprofiles) {
      for (const rack of activeDesign.rackprofiles) {
        for (const device of rack.devices || []) {
          placedDeviceIds.add(device.deviceId);
        }
      }
    }
    
    const unplacedCount = allDevices.filter(d => !placedDeviceIds.has(d.id)).length;
    if (unplacedCount > 0) {
      const percentUnplaced = Math.round((unplacedCount / allDevices.length) * 100);
      toast.warning(`${unplacedCount} of ${allDevices.length} devices (${percentUnplaced}%) are not placed in racks. Rack/RU positions won't be available.`, {
        duration: 5000,
      });
    }
    
    setGenerating(true);

    // Get all cable templates from the component library store
    const allCableTemplates = componentTemplates.filter(
      (c): c is CableType => c.type === ComponentType.Cable
    );

    // Get all transceiver templates from the component library store
    const allTransceiverTemplates = componentTemplates.filter(
      (c): c is Transceiver => c.type === ComponentType.Transceiver
    );

    console.log('[NetworkConnectionsTab] Sending', allCableTemplates.length, 'cable templates to worker');

    if (allCableTemplates.length === 0) {
      console.warn("[NetworkConnectionsTab] No cable templates found in the component library. Connection generation will likely fail to find cables.");
      // Optionally, you could even prevent the worker from starting if no cables are available.
      // toast.warn("No cable templates available in the library. Cannot generate connections.");
      // setGenerating(false);
      // return;
    }

    // Create a new worker with timeout protection
    const worker = new Worker(new URL('@/workers/connectionWorker.ts', import.meta.url), { type: 'module' });
    
    // Set up timeout to prevent infinite waiting
    const timeoutId = setTimeout(() => {
      console.warn('[NetworkConnectionsTab] Connection generation timed out after 30 seconds');
      worker.terminate();
      setGenerating(false);
      const timeoutAttempt: ConnectionAttempt = {
        status: "Failed",
        reason: "Connection generation timed out after 30 seconds. This may indicate a performance issue with your design complexity.",
      };
      setGenerationReport([timeoutAttempt]);
      setShowReport(true);
      toast.error("Connection generation timed out. Try reducing design complexity.");
    }, 30000); // 30 second timeout

    worker.onmessage = (event: MessageEvent<{ status: string, attempts?: ConnectionAttempt[], error?: string }>) => {
      clearTimeout(timeoutId); // Clear timeout on successful response
      if (event.data.status === 'success' && event.data.attempts) {
        const attempts = event.data.attempts;
        setGenerationReport(attempts);
        setShowReport(true);
        const successfulConnections = attempts.filter(a => a.status === "Success" && a.connection).map(a => a.connection!);
        setNetworkConnections(successfulConnections);
        if (successfulConnections.length > 0) {
          toast.success(`Successful network connections: ${successfulConnections.length}. See report for details.`);
        } else {
          toast.info("No successful connections established — see report for details.");
        }
      } else if (event.data.status === 'error') {
        console.error("Error from connection worker:", event.data.error);
        const errorAttempt: ConnectionAttempt = {
          status: "Failed",
          reason: event.data.error || "Unknown error occurred in worker",
        };
        setGenerationReport([errorAttempt]);
        setShowReport(true);
        toast.error("Error generating network connections. See report for details.");
      }
      setGenerating(false);
      worker.terminate(); // Terminate worker after use
    };

    worker.onerror = (error) => {
      clearTimeout(timeoutId); // Clear timeout on error
      console.error("Worker error:", error);
      const errorAttempt: ConnectionAttempt = {
        status: "Failed",
        reason: error.message || "Worker initialisation failed.",
      };
      setGenerationReport([errorAttempt]);
      setShowReport(true);
      toast.error("Failed to start connection generation process.");
      setGenerating(false);
      worker.terminate(); // Terminate worker on error
    };

    // Send data to the worker
    worker.postMessage({ 
      design: activeDesign, 
      rules: activeDesign.connectionRules || [],
      allCableTemplates: allCableTemplates, // Pass cable templates to worker
      allTransceiverTemplates: allTransceiverTemplates // Pass transceiver templates to worker
    });
  };

  // Save connections to the current design
  const handleSave = () => {
    if (!activeDesign) return;
    updateDesign(activeDesign.id, {
      networkConnections
    });
    toast.success("Network connections saved to design");
  };

  // Remove all connections from state and design
  const handleReset = () => {
    setNetworkConnections([]);
    if (activeDesign) {
      updateDesign(activeDesign.id, {
        networkConnections: []
      });
    }
    toast.success("All network connections cleared");
  };

  // Handle manual connections
  const handleManualConnectionsSave = (newConnections: NetworkConnection[]) => {
    setNetworkConnections([...networkConnections, ...newConnections]);
  };


  // Export connections to CSV
  const handleExportCSV = () => {
    if (displayedRows.length === 0) {
      toast.error("No connections to export");
      return;
    }

    // Create CSV header
    const header = columns.map(col => col.label).join(',');
    
    // Create CSV rows
    const rows = displayedRows.map(row => {
      return columns.map(col => {
        const value = row[col.key as keyof NetworkConnectionTableRow];
        // Escape values that contain commas or quotes
        const stringValue = String(value || '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });
    
    // Combine header and rows
    const csv = [header, ...rows].join('\n');
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `network_connections_${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`Exported ${displayedRows.length} connections to ${filename}`);
  };

  // Handle column header sort
  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="text-xl font-semibold flex items-center gap-2"><Network size={20} />Network Connections</div>
        <div className="flex gap-2 mt-2 sm:mt-0 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setShowManualDialog(true)}>
            <Cable className="w-4 h-4" /> New Connections
          </Button>
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
            <Plus className="w-4 h-4" /> {generating ? 'Generating...' : 'Generate'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="w-4 h-4" /> Distance Settings
          </Button>
          <Button size="sm" variant="outline" onClick={handleSave}><Save className="w-4 h-4" /> Save</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><Trash2 className="w-4 h-4" /> Reset</Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={displayedRows.length === 0}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>
      <div className="mb-2 flex flex-col sm:flex-row sm:justify-between items-center gap-2">
        <Input
          type="text"
          placeholder="Search all columns"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full sm:w-72"
        />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead
                  key={col.key}
                  className="cursor-pointer select-none"
                  onClick={() => handleSort(col.key)}
                >
                  {col.label} {sortCol === col.key && (sortDir === "asc" ? "▲" : "▼")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12 text-gray-400">
                  No network connections
                </TableCell>
              </TableRow>
            ) : (
              displayedRows.map((row, idx) => (
                <TableRow key={row.id + "-" + idx}>
                  {columns.map(col => (
                    <TableCell key={col.key}>
                      {col.key === 'calculatedDistanceMm' ? (
                        <CableDistanceTooltip 
                          distanceMm={row[col.key]} 
                          breakdown={row.distanceBreakdown} 
                        />
                      ) : (
                        row[col.key as keyof NetworkConnectionTableRow]
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* NEW: Modal for connection generation report */}
      {generationReport && (
        <ConnectionReportModal
          open={showReport}
          onClose={() => setShowReport(false)}
          report={generationReport}
        />
      )}
      
      {/* Manual Connection Dialog */}
      <ManualConnectionDialog
        open={showManualDialog}
        onClose={() => setShowManualDialog(false)}
        onSave={handleManualConnectionsSave}
      />
      
      {/* Cable Distance Settings Dialog */}
      <CableDistanceSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
      />
    </div>
  );
};

export default NetworkConnectionsTab;
