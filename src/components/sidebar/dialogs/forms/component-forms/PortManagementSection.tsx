import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ComponentType, ConnectorType } from '@/types/infrastructure';
import { PortSpeed, PortRole, MediaType, Port } from '@/types/infrastructure/port-types';

interface PortManagementSectionProps {
  componentType: ComponentType;
  formValues: any;
  addPort: () => void;
  removePort: (index: number) => void;
  updatePort: (index: number, field: keyof Port, value: any) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const PortManagementSection: React.FC<PortManagementSectionProps> = ({
  componentType,
  formValues,
  addPort,
  removePort,
  updatePort,
  onInputChange,
}) => {
  // Bulk port addition state
  const [bulkPort, setBulkPort] = useState({
    prefix: "",
    role: "",
    speed: "",
    connectorType: "",
    quantity: 1,
  });

  // Check if component type should show port management
  const shouldShowPorts = 
    componentType !== ComponentType.Transceiver && 
    componentType !== ComponentType.Cable;

  if (!shouldShowPorts) {
    return null;
  }

  const isPassiveDevice = 
    componentType === ComponentType.Cassette || 
    componentType === ComponentType.FiberPatchPanel || 
    componentType === ComponentType.CopperPatchPanel;

  const handleBulkPortChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setBulkPort((prev) => ({
      ...prev,
      [name]: name === "quantity" ? Number(value) : value,
    }));
  };

  const handleBulkAddPorts = () => {
    const { prefix, role, speed, connectorType, quantity } = bulkPort;
    if (!prefix || !speed || !connectorType || !quantity || quantity < 1) {
      alert("Please fill all fields for bulk port creation and use quantity >= 1.");
      return;
    }
    const startNum = (formValues.ports?.length || 0) + 1;
    const portsToAdd = Array.from({ length: quantity }).map((_, i) => ({
      id: crypto.randomUUID(),
      name: `${prefix}${startNum + i}`,
      role: role || undefined,
      speed,
      connectorType,
    }));
    // Append new ports to current list
    if (portsToAdd.length > 0) {
      let updatedPorts = [...(formValues.ports || []), ...portsToAdd];
      onInputChange({
        target: {
          name: "ports",
          value: updatedPorts,
        },
      } as any);
    }
    setBulkPort((prev) => ({ ...prev, quantity: 1 }));
  };

  return (
    <>
      {/* Bulk Port Addition Section */}
      <div className="mb-4 border p-3 rounded-lg">
        <div className="font-semibold mb-1">Add Multiple Ports</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <div>
            <label className="block text-xs font-medium mb-1" htmlFor="prefix">
              Prefix
            </label>
            <input
              type="text"
              name="prefix"
              id="bulk-port-prefix"
              value={bulkPort.prefix}
              onChange={handleBulkPortChange}
              placeholder="eth"
              className="border px-2 py-1 rounded w-full"
            />
          </div>
          {!isPassiveDevice && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1" htmlFor="role">
                  Role
                </label>
                <select
                  name="role"
                  value={bulkPort.role}
                  onChange={handleBulkPortChange}
                  className="border px-2 py-1 rounded w-full"
                >
                  <option value="">--</option>
                  {Object.values(PortRole).map((r) => (
                    <option value={r} key={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" htmlFor="speed">
                  Speed
                </label>
                <select
                  name="speed"
                  value={bulkPort.speed}
                  onChange={handleBulkPortChange}
                  className="border px-2 py-1 rounded w-full"
                >
                  <option value="">--</option>
                  {Object.values(PortSpeed).map((s) => (
                    <option value={s} key={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-medium mb-1" htmlFor="connectorType">
              Connector
            </label>
            <select
              name="connectorType"
              value={bulkPort.connectorType}
              onChange={handleBulkPortChange}
              className="border px-2 py-1 rounded w-full"
            >
              <option value="">--</option>
              {Object.values(ConnectorType).map((ct) => (
                <option value={ct} key={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" htmlFor="quantity">
              Qty
            </label>
            <input
              type="number"
              min={1}
              name="quantity"
              value={bulkPort.quantity}
              onChange={handleBulkPortChange}
              className="border px-2 py-1 rounded w-full"
            />
          </div>
        </div>
        <div className="mt-2">
          <button
            type="button"
            className="bg-blue-600 text-white py-1 px-3 rounded hover:bg-blue-700"
            onClick={handleBulkAddPorts}
          >
            Add Ports
          </button>
        </div>
      </div>

      {/* Individual Port Management Section */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <div className="font-semibold">Ports</div>
          <Button type="button" size="sm" onClick={addPort} data-testid="add-port">
            Add Port
          </Button>
        </div>
        {formValues.ports && formValues.ports.length > 0 ? (
          <div className="space-y-2">
            {formValues.ports.map((port: any, idx: number) => (
              <div
                key={port.id || idx}
                className="border rounded p-3 flex flex-col sm:flex-row gap-2 items-center flex-wrap"
              >
                <Input
                  type="text"
                  placeholder="Name (e.g. eth0)"
                  value={port.name || ''}
                  onChange={(e) => updatePort(idx, 'name', e.target.value)}
                  className="w-32"
                />
                {!isPassiveDevice && (
                  <>
                    <select
                      value={port.role || ''}
                      className="border rounded px-2 py-1"
                      onChange={(e) => updatePort(idx, 'role', e.target.value)}
                    >
                      <option value="">Role</option>
                      {Object.values(PortRole).map((r) => (
                        <option value={r} key={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                    <select
                      value={port.speed || PortSpeed.Speed1G}
                      className="border rounded px-2 py-1"
                      onChange={(e) => updatePort(idx, 'speed', e.target.value)}
                    >
                      {Object.values(PortSpeed).map((s) => (
                        <option value={s} key={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <select
                  value={port.connectorType || ConnectorType.RJ45}
                  className="border rounded px-2 py-1"
                  onChange={(e) => updatePort(idx, 'connectorType', e.target.value)}
                >
                  {Object.values(ConnectorType).map((ct) => (
                    <option value={ct} key={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
                <select
                  value={port.mediaType || ''}
                  className="border rounded px-2 py-1"
                  onChange={(e) => updatePort(idx, 'mediaType', e.target.value || undefined)}
                >
                  <option value="">Media Type (Optional)</option>
                  {Object.values(MediaType).map((mt) => (
                    <option value={mt} key={mt}>
                      {mt}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removePort(idx)}
                  data-testid={`remove-port-${idx}`}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 my-2">
            No ports defined. Add at least one port for network rules.
          </div>
        )}
      </div>
    </>
  );
};