import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useDesignStore } from "@/store/designStore";
import { generateConnections } from "@/services/connectionService";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Plus, Network } from "lucide-react";
import { InfrastructureDesign, NetworkConnection, RackProfile, InfrastructureComponent, ComponentType, Cable, Port, Transceiver } from "@/types/infrastructure";
import type { ConnectionAttempt } from "@/types/infrastructure/connection-service-types";
import ConnectionReportModal from "./ConnectionReportModal";

// Table display row type for formatted data
type NetworkConnectionTableRow = {
  id: string;
  sourceDeviceId: string;
  sourcePortId: string;
  srcRack: string;
  srcRU: string | number;
  destinationDeviceId: string;
  destinationPortId: string;
  dstRack: string;
  dstRU: string | number;
  cableType: string;
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

const getRackAndRU = (rackprofiles: RackProfile[] | undefined, deviceId: string) => {
  if (!rackprofiles) return { rack: "-", ru: "-" };
  for (const rack of rackprofiles) {
    for (const d of rack.devices) {
      if (d.deviceId === deviceId) {
        return { rack: rack.name || rack.id.substring(0, 6), ru: d.ruPosition ?? "-" };
      }
    }
  }
  return { rack: "-", ru: "-" };
};

const columns = [
  { key: 'sourceDeviceId', label: 'Source Device' },
  { key: 'sourcePortId', label: 'Source Port' },
  { key: 'srcRack', label: 'Source Rack' },
  { key: 'srcRU', label: 'Source RU' },
  { key: 'destinationDeviceId', label: 'Destination Device' },
  { key: 'destinationPortId', label: 'Destination Port' },
  { key: 'dstRack', label: 'Destination Rack' },
  { key: 'dstRU', label: 'Destination RU' },
  { key: 'cableType', label: 'Cable Type' },
  { key: 'lengthMeters', label: 'Cable Length (m)' },
  { key: 'transceiverSourceModel', label: 'Src Transceiver' },
  { key: 'transceiverDestinationModel', label: 'Dst Transceiver' }
];

const formatConnectionRow = (
  row: NetworkConnection,
  allDesignComponents: InfrastructureComponent[],
  racks: RackProfile[] | undefined
): NetworkConnectionTableRow => {
  const srcDeviceName = getDeviceName(allDesignComponents, row.sourceDeviceId);
  const dstDeviceName = getDeviceName(allDesignComponents, row.destinationDeviceId);
  
  const srcPortName = getPortName(row.sourceDeviceId, row.sourcePortId, allDesignComponents);
  const dstPortName = getPortName(row.destinationDeviceId, row.destinationPortId, allDesignComponents);

  const srcRackObj = getRackAndRU(racks, row.sourceDeviceId);
  const dstRackObj = getRackAndRU(racks, row.destinationDeviceId);
  return {
    id: row.id,
    sourceDeviceId: srcDeviceName,
    sourcePortId: srcPortName,
    srcRack: srcRackObj.rack,
    srcRU: srcRackObj.ru,
    destinationDeviceId: dstDeviceName,
    destinationPortId: dstPortName,
    dstRack: dstRackObj.rack,
    dstRU: dstRackObj.ru,
    cableType: row.mediaType || "-",
    lengthMeters: typeof row.lengthMeters === "number" && !isNaN(row.lengthMeters) ? row.lengthMeters.toFixed(1) : "-",
    transceiverSourceModel: row.transceiverSourceModel || "-",
    transceiverDestinationModel: row.transceiverDestinationModel || "-",
    status: row.status,
    notes: row.notes,
  };
};

const NetworkConnectionsTab: React.FC = () => {
  const { activeDesign, updateDesign, componentTemplates } = useDesignStore();
  const [generating, setGenerating] = useState(false);
  const [networkConnections, setNetworkConnections] = useState<NetworkConnection[]>(activeDesign?.networkConnections || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState<string>("sourceDeviceId");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [generationReport, setGenerationReport] = useState<ConnectionAttempt[] | null>(null);
  const [showReport, setShowReport] = useState(false);

  const displayedRows = useMemo(() => {
    const designComponents = activeDesign?.components || [];
    const rows: NetworkConnectionTableRow[] = (networkConnections || []).map(r =>
      formatConnectionRow(r, designComponents, activeDesign?.rackprofiles)
    );
    let filtered = filterConnections(rows, searchQuery);

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
  }, [networkConnections, searchQuery, sortCol, sortDir, activeDesign]);

  const handleGenerate = () => {
    if (!activeDesign) return;
    setGenerating(true);

    // Get all cable templates from the component library store
    const allCableTemplates = componentTemplates.filter(
      (c): c is Cable => c.type === ComponentType.Cable
    );

    // Get all transceiver templates from the component library store
    const allTransceiverTemplates = componentTemplates.filter(
      (c): c is Transceiver => c.type === ComponentType.Transceiver
    );

    console.log('[NetworkConnectionsTab] All cable templates from store being sent to worker:', 
      allCableTemplates.map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.type, 
        connectorA: (c as any).connectorA_Type,
        connectorB: (c as any).connectorB_Type
      }))
    );

    if (allCableTemplates.length === 0) {
      console.warn("[NetworkConnectionsTab] No cable templates found in the component library. Connection generation will likely fail to find cables.");
      // Optionally, you could even prevent the worker from starting if no cables are available.
      // toast.warn("No cable templates available in the library. Cannot generate connections.");
      // setGenerating(false);
      // return;
    }

    // Create a new worker
    const worker = new Worker(new URL('@/workers/connectionWorker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event: MessageEvent<{ status: string, attempts?: ConnectionAttempt[], error?: string }>) => {
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

  // Send BOM to Bill of Materials
  const handleBOM = () => {
    toast.info("BOM function not yet implemented. (Call your network BOM handler here.)");
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
          <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
            <Plus className="w-4 h-4" /> Generate
          </Button>
          <Button size="sm" variant="outline" onClick={handleSave}><Save className="w-4 h-4" /> Save</Button>
          <Button size="sm" variant="outline" onClick={handleReset}><Trash2 className="w-4 h-4" /> Reset</Button>
          <Button size="sm" variant="secondary" onClick={handleBOM}>Send to Bill of Materials</Button>
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
                    <TableCell key={col.key}>{row[col.key as keyof NetworkConnectionTableRow]}</TableCell>
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
    </div>
  );
};

export default NetworkConnectionsTab;
