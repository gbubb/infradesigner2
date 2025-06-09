import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AlertCircle, Calculator } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';
import { Server } from '@/types/infrastructure/server-types';
import { PowerBreakdownChart } from './PowerBreakdownChart';
import { PowerConsumptionChart } from './PowerConsumptionChart';
import { PowerCalibrationSection } from './PowerCalibrationSection';
import { saveCalibrationProfile, PowerCalibrationProfile } from './powerCalibration';
import { PowerValidationDialog } from './PowerValidationDialog';
import { PowerCalculationParameters } from './PowerCalculationParameters';
import { PowerBreakdownTable } from './PowerBreakdownTable';

// Configuration Components
import { CPUConfiguration } from '../power-prediction/configs/CPUConfiguration';
import { MemoryConfiguration } from '../power-prediction/configs/MemoryConfiguration';
import { StorageConfiguration } from '../power-prediction/configs/StorageConfiguration';
import { NetworkConfiguration } from '../power-prediction/configs/NetworkConfiguration';
import { UtilizationConfiguration } from '../power-prediction/configs/UtilizationConfiguration';

// Shared Components
import { PowerResultsDisplay } from '../power-prediction/shared/PowerResultsDisplay';

// Hooks
import { usePowerPredictionState } from '@/hooks/power-prediction/usePowerPredictionState';
import { useDeviceManagement } from '@/hooks/power-prediction/useDeviceManagement';
import { usePowerCalculation } from '@/hooks/power-prediction/usePowerCalculation';

export const PowerPredictionTab: React.FC = () => {
  const { componentTemplates } = useDesignStore();
  
  // Filter servers from component library
  const servers = useMemo(() => 
    componentTemplates?.filter(c => c.type === ComponentType.Server) as Server[] || [],
    [componentTemplates]
  );
  
  // State management
  const {
    selectedServerId,
    selectedServer,
    customInputs,
    storageDevices,
    networkPorts,
    calculationResult,
    calibrationProfile,
    showCalibration,
    showValidation,
    selectedPowerState,
    setSelectedServerId,
    updateCustomInputs,
    setStorageDevices,
    setNetworkPorts,
    setCalculationResult,
    setCalibrationProfile,
    setShowCalibration,
    setShowValidation,
    setSelectedPowerState
  } = usePowerPredictionState(servers);
  
  // Device management
  const {
    addStorageDevice,
    removeStorageDevice,
    updateStorageDevice,
    addNetworkPort,
    removeNetworkPort,
    updateNetworkPort
  } = useDeviceManagement(storageDevices, setStorageDevices, networkPorts, setNetworkPorts);
  
  // Power calculation
  const {
    powerInputs,
    handleCalculate,
    handleCalibrationChange
  } = usePowerCalculation(
    selectedServer,
    customInputs,
    storageDevices,
    networkPorts,
    calibrationProfile,
    setCalculationResult
  );
  
  // Handle calibration profile changes
  const onCalibrationChange = (profile: PowerCalibrationProfile | null) => {
    setCalibrationProfile(profile);
    handleCalibrationChange(profile);
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
            <CPUConfiguration
              customInputs={customInputs}
              onUpdate={updateCustomInputs}
            />
            
            <MemoryConfiguration
              customInputs={customInputs}
              selectedServer={selectedServer}
              onUpdate={updateCustomInputs}
            />
            
            <StorageConfiguration
              raidController={customInputs.raidController || false}
              storageDevices={storageDevices}
              onRaidControllerChange={(enabled) => updateCustomInputs({ raidController: enabled })}
              onAddDevice={addStorageDevice}
              onUpdateDevice={updateStorageDevice}
              onRemoveDevice={removeStorageDevice}
            />
            
            <NetworkConfiguration
              networkPorts={networkPorts}
              onAddPort={addNetworkPort}
              onUpdatePort={updateNetworkPort}
              onRemovePort={removeNetworkPort}
            />
          </TabsContent>
          
          <TabsContent value="environmental" className="space-y-4">
            <UtilizationConfiguration
              customInputs={customInputs}
              selectedServer={selectedServer}
              onUpdate={updateCustomInputs}
            />
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
            <PowerCalibrationSection onCalibrationChange={onCalibrationChange} />
          )}
        </div>
      )}
      
      {calculationResult && (
        <div className="space-y-6">
          {/* Results Summary */}
          <PowerResultsDisplay
            calculationResult={calculationResult}
            selectedPowerState={selectedPowerState}
            onPowerStateChange={setSelectedPowerState}
          />
          
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