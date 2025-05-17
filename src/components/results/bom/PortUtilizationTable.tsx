
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from '@/components/ui/table';

export function PortUtilizationTable({ rows }: { rows: any[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Device</TableHead>
          <TableHead>Port</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Speed</TableHead>
          <TableHead>Media</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Transceiver</TableHead>
          <TableHead>Connected To</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, idx) => (
          <TableRow key={`port-row-${row.deviceId}-${row.portName}-${idx}`}>
            <TableCell>{row.deviceName}</TableCell>
            <TableCell>{row.portName}</TableCell>
            <TableCell>{row.portType}</TableCell>
            <TableCell>{row.speed}</TableCell>
            <TableCell>{row.mediaType}</TableCell>
            <TableCell>
              {row.status === "Used" ? (
                <span className="text-green-700 font-medium">Used</span>
              ) : (
                <span className="text-gray-500">Free</span>
              )}
            </TableCell>
            <TableCell>{row.transceiver}</TableCell>
            <TableCell>{row.connectedTo}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
