import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calculator, Plus, Trash2, Settings } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';
import { PowerCalculationInputs, PowerCalculationResult, calculateServerPower } from './powerCalculations';
import { Server } from '@/types/infrastructure/server-types';
import { PowerBreakdownChart } from './PowerBreakdownChart';
import { PowerConsumptionChart } from './PowerConsumptionChart';
import { PowerCalibrationSection } from './PowerCalibrationSection';
import { PowerCalibrationProfile, getActiveCalibrationProfile, saveCalibrationProfile } from './powerCalibration';
import { PowerValidationDialog } from './PowerValidationDialog';
import { PowerCalculationParameters } from './PowerCalculationParameters';
import { PowerBreakdownTable } from './PowerBreakdownTable';

interface StorageDevice {
  id: string;
  type: 'HDD' | 'SSD_SATA' | 'NVMe';
  count: number;
  capacityTB: number;
  rpm?: number;
  generation?: 3 | 4 | 5;
}

interface NetworkPort {
  id: string;
  count: number;
  speedGbps: 1 | 10 | 25 | 40 | 100;
}

export const PowerPredictionTab: React.FC = () => {
  const { componentTemplates } = useDesignStore();
  
  // Filter servers from component library
  const servers = useMemo(() => 
    componentTemplates?.filter(c => c.type === ComponentType.Server) as Server[] || [],
    [componentTemplates]
  );
  
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [customInputs, setCustomInputs] = useState<Partial<PowerCalculationInputs>>({
    cpuUtilization: 50,
    turboEnabled: true,
    memoryType: 'DDR4',
    memorySpeedMHz: 2933,
    raidController: false,
    psuEfficiencyRating: '80PlusGold',
    redundantPsu: true,
    inletTempC: 25,
  });
  
  const [storageDevices, setStorageDevices] = useState<StorageDevice[]>([]);
  const [networkPorts, setNetworkPorts] = useState<NetworkPort[]>([]);
  const [calculationResult, setCalculationResult] = useState<PowerCalculationResult | null>(null);
  const [calibrationProfile, setCalibrationProfile] = useState<PowerCalibrationProfile | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [selectedPowerState, setSelectedPowerState] = useState<'idle' | 'average' | 'peak'>('average');
  
  const selectedServer = useMemo(() => 
    servers.find(s => s.id === selectedServerId),
    [servers, selectedServerId]
  );
  
  // Build complete inputs from selected server and custom inputs
  const powerInputs = useMemo((): PowerCalculationInputs | null => {
    if (!selectedServer) return null;
    
    // Parse storage from selected server
    const hdds: PowerCalculationInputs['hdds'] = [];
    const ssdSata: PowerCalculationInputs['ssdSata'] = [];
    const nvme: PowerCalculationInputs['nvme'] = [];
    
    storageDevices.forEach(device => {
      if (device.type === 'HDD') {
        hdds.push({
          count: device.count,
          capacityTB: device.capacityTB,
          rpm: device.rpm || 7200
        });
      } else if (device.type === 'SSD_SATA') {
        ssdSata.push({
          count: device.count,
          capacityTB: device.capacityTB
        });
      } else if (device.type === 'NVMe') {
        nvme.push({
          count: device.count,
          capacityTB: device.capacityTB,
          generation: device.generation || 4
        });
      }
    });
    
    // Parse network ports
    const networkPortsArray: PowerCalculationInputs['networkPorts'] = networkPorts.map(port => ({
      count: port.count,
      speedGbps: port.speedGbps
    }));
    
    return {
      // CPU from server
      cpuModel: selectedServer.cpuModel || 'Unknown',
      cpuCount: selectedServer.cpuSockets || 1,
      coresPerCpu: selectedServer.cpuCoresPerSocket || selectedServer.coreCount || 16,
      baseFrequencyGHz: customInputs.baseFrequencyGHz || 2.4,
      tdpPerCpu: customInputs.tdpPerCpu || 150,
      turboEnabled: customInputs.turboEnabled || false,
      cpuUtilization: customInputs.cpuUtilization || 50,
      
      // Memory from server
      memoryType: customInputs.memoryType || 'DDR4',
      dimmCount: customInputs.dimmCount || Math.ceil((selectedServer.memoryCapacity || 128) / 32),
      dimmCapacityGB: customInputs.dimmCapacityGB || 32,
      memorySpeedMHz: customInputs.memorySpeedMHz || 2933,
      
      // Storage
      hdds,
      ssdSata,
      nvme,
      raidController: customInputs.raidController || false,
      
      // Network
      networkPorts: networkPortsArray,
      
      // PSU
      psuRating: customInputs.psuRating || (selectedServer.power ? selectedServer.power * 1.5 : 750),
      psuEfficiencyRating: customInputs.psuEfficiencyRating || '80PlusGold',
      redundantPsu: customInputs.redundantPsu !== undefined ? customInputs.redundantPsu : true,
      
      // Environmental
      inletTempC: customInputs.inletTempC || 25,
      formFactor: (selectedServer.ruSize === 1 ? '1U' : selectedServer.ruSize === 2 ? '2U' : '4U') as '1U' | '2U' | '4U'
    };
  }, [selectedServer, customInputs, storageDevices, networkPorts]);
  
  const handleCalculate = () => {
    if (!powerInputs) return;
    const result = calculateServerPower(powerInputs, calibrationProfile || undefined);
    setCalculationResult(result);
  };
  
  const handleCalibrationChange = (profile: PowerCalibrationProfile | null) => {
    setCalibrationProfile(profile);
    // Recalculate if we already have results
    if (powerInputs && calculationResult) {
      const result = calculateServerPower(powerInputs, profile || undefined);
      setCalculationResult(result);
    }
  };
  
  const addStorageDevice = () => {
    setStorageDevices([...storageDevices, {
      id: Date.now().toString(),
      type: 'HDD',
      count: 1,
      capacityTB: 1,
      rpm: 7200
    }]);
  };
  
  const removeStorageDevice = (id: string) => {
    setStorageDevices(storageDevices.filter(d => d.id !== id));
  };
  
  const updateStorageDevice = (id: string, updates: Partial<StorageDevice>) => {
    setStorageDevices(storageDevices.map(d => 
      d.id === id ? { ...d, ...updates } : d
    ));
  };
  
  const addNetworkPort = () => {
    setNetworkPorts([...networkPorts, {
      id: Date.now().toString(),
      count: 1,
      speedGbps: 10
    }]);
  };
  
  const removeNetworkPort = (id: string) => {
    setNetworkPorts(networkPorts.filter(p => p.id !== id));
  };
  
  const updateNetworkPort = (id: string, updates: Partial<NetworkPort>) => {
    setNetworkPorts(networkPorts.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Server Power Prediction</CardTitle>
          <CardDescription>
            Select a server from your component library and configure its specifications to predict power consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="server-select">Select Server Component</Label>
              <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                <SelectTrigger id="server-select">
                  <SelectValue placeholder="Choose a server from your library" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map(server => (
                    <SelectItem key={server.id} value={server.id}>
                      {server.manufacturer} {server.productLine} {server.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedServer && (
              <Alert>
                <AlertDescription>
                  <div className="text-sm space-y-1">
                    <div><strong>Selected:</strong> {selectedServer.manufacturer} {selectedServer.productLine} {selectedServer.model}</div>
                    <div><strong>CPU:</strong> {selectedServer.cpuSockets}x {selectedServer.cpuModel} ({selectedServer.cpuCoresPerSocket || selectedServer.coreCount} cores each)</div>
                    <div><strong>Memory:</strong> {selectedServer.memoryCapacity}GB</div>
                    <div><strong>Form Factor:</strong> {selectedServer.ruSize}U</div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
      
      {selectedServer && (
        <Tabs defaultValue="specifications" className="w-full">
          <TabsList>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="environmental">Environmental</TabsTrigger>
          </TabsList>
          
          <TabsContent value="specifications" className="space-y-4">
            {/* CPU Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CPU Configuration</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="base-freq">Base Frequency (GHz)</Label>
                  <Input
                    id="base-freq"
                    type="number"
                    step="0.1"
                    value={customInputs.baseFrequencyGHz || 2.4}
                    onChange={(e) => setCustomInputs({...customInputs, baseFrequencyGHz: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="tdp">TDP per CPU (W)</Label>
                  <Input
                    id="tdp"
                    type="number"
                    value={customInputs.tdpPerCpu || 150}
                    onChange={(e) => setCustomInputs({...customInputs, tdpPerCpu: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="cpu-util">CPU Utilization (%)</Label>
                  <Input
                    id="cpu-util"
                    type="number"
                    min="0"
                    max="100"
                    value={customInputs.cpuUtilization}
                    onChange={(e) => setCustomInputs({...customInputs, cpuUtilization: parseInt(e.target.value)})}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="turbo"
                    checked={customInputs.turboEnabled}
                    onCheckedChange={(checked) => setCustomInputs({...customInputs, turboEnabled: checked})}
                  />
                  <Label htmlFor="turbo">Turbo Boost Enabled</Label>
                </div>
              </CardContent>
            </Card>
            
            {/* Memory Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Memory Configuration</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mem-type">Memory Type</Label>
                  <Select 
                    value={customInputs.memoryType} 
                    onValueChange={(value: 'DDR3' | 'DDR4' | 'DDR5') => setCustomInputs({...customInputs, memoryType: value})}
                  >
                    <SelectTrigger id="mem-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DDR3">DDR3</SelectItem>
                      <SelectItem value="DDR4">DDR4</SelectItem>
                      <SelectItem value="DDR5">DDR5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="mem-speed">Memory Speed (MHz)</Label>
                  <Input
                    id="mem-speed"
                    type="number"
                    value={customInputs.memorySpeedMHz}
                    onChange={(e) => setCustomInputs({...customInputs, memorySpeedMHz: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="dimm-count">Number of DIMMs</Label>
                  <Input
                    id="dimm-count"
                    type="number"
                    value={customInputs.dimmCount || Math.ceil((selectedServer.memoryCapacity || 128) / 32)}
                    onChange={(e) => setCustomInputs({...customInputs, dimmCount: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="dimm-cap">DIMM Capacity (GB)</Label>
                  <Input
                    id="dimm-cap"
                    type="number"
                    value={customInputs.dimmCapacityGB || 32}
                    onChange={(e) => setCustomInputs({...customInputs, dimmCapacityGB: parseInt(e.target.value)})}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Storage Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Storage Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="raid"
                      checked={customInputs.raidController}
                      onCheckedChange={(checked) => setCustomInputs({...customInputs, raidController: checked})}
                    />
                    <Label htmlFor="raid">RAID Controller</Label>
                  </div>
                  <Button size="sm" onClick={addStorageDevice}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Storage Device
                  </Button>
                </div>
                
                {storageDevices.map(device => (
                  <div key={device.id} className="grid grid-cols-5 gap-2 items-end">
                    <div>
                      <Label>Type</Label>
                      <Select 
                        value={device.type} 
                        onValueChange={(value: 'HDD' | 'SSD_SATA' | 'NVMe') => updateStorageDevice(device.id, { type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HDD">HDD</SelectItem>
                          <SelectItem value="SSD_SATA">SATA SSD</SelectItem>
                          <SelectItem value="NVMe">NVMe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Count</Label>
                      <Input
                        type="number"
                        min="1"
                        value={device.count}
                        onChange={(e) => updateStorageDevice(device.id, { count: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Capacity (TB)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={device.capacityTB}
                        onChange={(e) => updateStorageDevice(device.id, { capacityTB: parseFloat(e.target.value) })}
                      />
                    </div>
                    {device.type === 'HDD' && (
                      <div>
                        <Label>RPM</Label>
                        <Select 
                          value={device.rpm?.toString()} 
                          onValueChange={(value) => updateStorageDevice(device.id, { rpm: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5400">5400</SelectItem>
                            <SelectItem value="7200">7200</SelectItem>
                            <SelectItem value="10000">10000</SelectItem>
                            <SelectItem value="15000">15000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {device.type === 'NVMe' && (
                      <div>
                        <Label>Generation</Label>
                        <Select 
                          value={device.generation?.toString()} 
                          onValueChange={(value) => updateStorageDevice(device.id, { generation: parseInt(value) as 3 | 4 | 5 })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">Gen 3</SelectItem>
                            <SelectItem value="4">Gen 4</SelectItem>
                            <SelectItem value="5">Gen 5</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeStorageDevice(device.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            {/* Network Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button size="sm" onClick={addNetworkPort}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Network Port
                  </Button>
                </div>
                
                {networkPorts.map(port => (
                  <div key={port.id} className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Port Count</Label>
                      <Input
                        type="number"
                        min="1"
                        value={port.count}
                        onChange={(e) => updateNetworkPort(port.id, { count: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Speed</Label>
                      <Select 
                        value={port.speedGbps.toString()} 
                        onValueChange={(value) => updateNetworkPort(port.id, { speedGbps: parseInt(value) as 1 | 10 | 25 | 40 | 100 })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 GbE</SelectItem>
                          <SelectItem value="10">10 GbE</SelectItem>
                          <SelectItem value="25">25 GbE</SelectItem>
                          <SelectItem value="40">40 GbE</SelectItem>
                          <SelectItem value="100">100 GbE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeNetworkPort(port.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="environmental" className="space-y-4">
            {/* PSU Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Power Supply Configuration</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="psu-rating">PSU Rating (W)</Label>
                  <Input
                    id="psu-rating"
                    type="number"
                    value={customInputs.psuRating || (selectedServer.power ? selectedServer.power * 1.5 : 750)}
                    onChange={(e) => setCustomInputs({...customInputs, psuRating: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="psu-eff">PSU Efficiency Rating</Label>
                  <Select 
                    value={customInputs.psuEfficiencyRating} 
                    onValueChange={(value: PowerCalculationInputs['psuEfficiencyRating']) => setCustomInputs({...customInputs, psuEfficiencyRating: value})}
                  >
                    <SelectTrigger id="psu-eff">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80Plus">80 Plus</SelectItem>
                      <SelectItem value="80PlusBronze">80 Plus Bronze</SelectItem>
                      <SelectItem value="80PlusSilver">80 Plus Silver</SelectItem>
                      <SelectItem value="80PlusGold">80 Plus Gold</SelectItem>
                      <SelectItem value="80PlusPlatinum">80 Plus Platinum</SelectItem>
                      <SelectItem value="80PlusTitanium">80 Plus Titanium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    id="redundant-psu"
                    checked={customInputs.redundantPsu}
                    onCheckedChange={(checked) => setCustomInputs({...customInputs, redundantPsu: checked})}
                  />
                  <Label htmlFor="redundant-psu">Redundant PSU Configuration</Label>
                </div>
              </CardContent>
            </Card>
            
            {/* Environmental */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Environmental Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-1/2">
                  <Label htmlFor="inlet-temp">Inlet Temperature (°C)</Label>
                  <Input
                    id="inlet-temp"
                    type="number"
                    value={customInputs.inletTempC}
                    onChange={(e) => setCustomInputs({...customInputs, inletTempC: parseInt(e.target.value)})}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {selectedServer && (
        <div className="space-y-4">
          <div className="flex justify-center gap-4">
            <Button size="lg" onClick={handleCalculate}>
              <Calculator className="h-4 w-4 mr-2" />
              Calculate Power Consumption
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setShowCalibration(!showCalibration)}
            >
              {showCalibration ? 'Hide' : 'Show'} Calibration
            </Button>
            {calculationResult && (
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => setShowValidation(true)}
              >
                Validate Results
              </Button>
            )}
          </div>
          
          {showCalibration && (
            <PowerCalibrationSection onCalibrationChange={handleCalibrationChange} />
          )}
        </div>
      )}
      
      {calculationResult && (
        <div className="space-y-6">
          {/* Results Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Power Consumption Prediction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{calculationResult.idlePowerW}W</div>
                  <div className="text-sm text-muted-foreground">Idle Power</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{calculationResult.averagePowerW}W</div>
                  <div className="text-sm text-muted-foreground">Average Power</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{calculationResult.peakPowerW}W</div>
                  <div className="text-sm text-muted-foreground">Peak Power</div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">DC Power (at average load):</span>
                  <span className="ml-2 font-medium">{calculationResult.dcTotalW.average}W</span>
                </div>
                <div>
                  <span className="text-muted-foreground">AC Power (at average load):</span>
                  <span className="ml-2 font-medium">{calculationResult.acTotalW.average}W</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Component Breakdown Chart */}
          <PowerBreakdownChart breakdown={calculationResult.componentBreakdown} />
          
          {/* Power Consumption Chart */}
          <PowerConsumptionChart 
            result={calculationResult} 
            inputs={powerInputs}
            calibrationProfile={calibrationProfile}
          />
          
          {/* Calculation Parameters */}
          {powerInputs && (
            <PowerCalculationParameters 
              inputs={powerInputs} 
              calibrationProfile={calibrationProfile}
            />
          )}
          
          {/* Component Power Breakdown Table */}
          <PowerBreakdownTable
            result={calculationResult}
            selectedState={selectedPowerState}
          />
          
          {/* Warnings and Missing Metrics */}
          {calculationResult.warnings.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Warnings:</div>
                <ul className="list-disc list-inside space-y-1">
                  {calculationResult.warnings.map((warning, i) => (
                    <li key={i} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {calculationResult.missingMetrics.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Missing metrics that would improve accuracy:</div>
                <ul className="list-disc list-inside space-y-1">
                  {calculationResult.missingMetrics.map((metric, i) => (
                    <li key={i} className="text-sm">{metric}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Real vs Predicted Comparison */}
          {calibrationProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Calibration Profile Applied</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Profile:</span>
                    <span className="ml-2 font-medium">{calibrationProfile.name}</span>
                  </p>
                  {calibrationProfile.description && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Description:</span>
                      <span className="ml-2">{calibrationProfile.description}</span>
                    </p>
                  )}
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Key Adjustments:</p>
                    <ul className="text-sm space-y-1">
                      <li>• CPU Idle: {(calibrationProfile.cpuIdleMultiplier * 100).toFixed(0)}% of TDP</li>
                      <li>• Safety Margin: {calibrationProfile.safetyMarginPercent}%</li>
                      <li>• Temperature Coefficient: {calibrationProfile.tempCoefficientPerDegree} per °C</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Validation Dialog */}
      {calculationResult && selectedServer && (
        <PowerValidationDialog
          open={showValidation}
          onOpenChange={setShowValidation}
          calculationResult={calculationResult}
          serverModel={`${selectedServer.manufacturer} ${selectedServer.productLine} ${selectedServer.model}`}
          onValidationSave={(observedValues) => {
            if (calibrationProfile) {
              // Add validation data to the calibration profile
              const updatedProfile = {
                ...calibrationProfile,
                validationData: [
                  ...(calibrationProfile.validationData || []),
                  {
                    serverModel: `${selectedServer.manufacturer} ${selectedServer.productLine} ${selectedServer.model}`,
                    observedPower: observedValues,
                    predictedPower: {
                      idle: calculationResult.idlePowerW,
                      average: calculationResult.averagePowerW,
                      peak: calculationResult.peakPowerW
                    },
                    accuracy: {
                      idle: 100 - Math.abs((calculationResult.idlePowerW - observedValues.idle) / observedValues.idle * 100),
                      average: 100 - Math.abs((calculationResult.averagePowerW - observedValues.average) / observedValues.average * 100),
                      peak: 100 - Math.abs((calculationResult.peakPowerW - observedValues.peak) / observedValues.peak * 100)
                    }
                  }
                ]
              };
              saveCalibrationProfile(updatedProfile);
              setCalibrationProfile(updatedProfile);
            }
          }}
        />
      )}
    </div>
  );
};