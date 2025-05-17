
import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useDesignStore } from "@/store/designStore";
import { generateConnections } from "@/services/connectionService";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Plus, Network } from "lucide-react";
import { InfrastructureDesign, NetworkConnection, RackProfile, InfrastructureComponent } from "@/types/infrastructure";

// Utility for searching/filtering table rows
function filterConnections(rows: NetworkConnection[], q: string) {
  if (!q) return rows;
  const lowerQ = q.toLowerCase();
  return rows.filter(row =>
    Object.values(row).some(val =>
      val && typeof val === "string" && val.toLowerCase().includes(lowerQ)
    )
  );
}

const getDeviceName = (list: InfrastructureComponent[], id: string) => {
  return list.find(d => d.id === id)?.name || id.substring(0, 6);
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
  components: InfrastructureComponent[],
  racks: RackProfile[] | undefined
) => {
  const srcName = getDeviceName(components, row.sourceDeviceId);
  const dstName = getDeviceName(components, row.destinationDeviceId);
  const srcRackObj = getRackAndRU(racks, row.sourceDeviceId);
  const dstRackObj = getRackAndRU(racks, row.destinationDeviceId);
  return {
    ...row,
    sourceDeviceId: srcName,
    srcRack: srcRackObj.rack,
    srcRU: srcRackObj.ru,
    destinationDeviceId: dstName,
    dstRack: dstRackObj.rack,
    dstRU: dstRackObj.ru,
    cableType: row.mediaType || "-",
    lengthMeters: row.lengthMeters?.toFixed ? row.lengthMeters.toFixed(1) : row.lengthMeters || "-",
    transceiverSourceModel: row.transceiverSourceModel || "-",
    transceiverDestinationModel: row.transceiverDestinationModel || "-"
  };
};

const NetworkConnectionsTab: React.FC = () => {
  const { activeDesign, updateDesign } = useDesignStore();
  const [generating, setGenerating] = useState(false);
  const [networkConnections, setNetworkConnections] = useState<NetworkConnection[]>(activeDesign?.networkConnections || []);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState<string>("sourceDeviceId");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");

  // Memoized filtered and sorted rows
  const displayedRows = useMemo(() => {
    let rows = (networkConnections || []).map(r => formatConnectionRow(r, activeDesign?.components || [], activeDesign?.rackprofiles));
    rows = filterConnections(rows, searchQuery);

    if (sortCol) {
      rows.sort((a, b) => {
        const aval = a[sortCol] ?? "";
        const bval = b[sortCol] ?? "";
        if (aval === bval) return 0;
        if (sortDir === "asc") return aval < bval ? -1 : 1;
        return aval > bval ? -1 : 1;
      });
    }
    return rows;
  }, [networkConnections, searchQuery, sortCol, sortDir, activeDesign]);

  // Generate connections
  const handleGenerate = () => {
    if (!activeDesign) return;
    setGenerating(true);
    try {
      const connections = generateConnections(activeDesign, activeDesign.connectionRules || []);
      setNetworkConnections(connections);
      toast.success(`Generated ${connections.length} network connections`);
    } catch (err) {
      toast.error("Error generating network connections");
    } finally {
      setGenerating(false);
    }
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
                    <TableCell key={col.key}>{row[col.key]}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default NetworkConnectionsTab;
