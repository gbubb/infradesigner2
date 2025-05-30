import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, Copy, TrendingUp, TrendingDown } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { TcoScenario, ScenarioParameter } from '@/types/infrastructure/tco-types';
import { ScenarioComparisonChart } from './charts/ScenarioComparisonChart';
import { ParameterSensitivityChart } from './charts/ParameterSensitivityChart';
import { TcoCostBreakdownChart } from './charts/TcoCostBreakdownChart';
import { calculateScenarioTco } from '@/utils/tcoCalculations';

export const TcoSensitivityAnalysis: React.FC = () => {
  const { requirements, activeDesign } = useDesignStore();
  const [scenarios, setScenarios] = useState<TcoScenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('scenarios');

  // Create a new scenario based on current design
  const createScenario = () => {
    const newScenario: TcoScenario = {
      id: `scenario-${Date.now()}`,
      name: `Scenario ${scenarios.length + 1}`,
      description: '',
      baseRequirements: JSON.parse(JSON.stringify(requirements)), // Deep clone
      parameters: {
        computeScale: 1.0,
        storageScale: 1.0,
        utilization: 50,
        availabilityZones: requirements.physicalConstraints.totalAvailabilityZones || 1,
        rackQuantity: requirements.physicalConstraints.computeStorageRackQuantity || 1,
        networkRedundancy: 1.0,
        powerEfficiency: 1.0,
        deviceLifespan: {
          compute: requirements.computeRequirements.deviceLifespanYears || 3,
          storage: requirements.storageRequirements.deviceLifespanYears || 3,
          network: requirements.networkRequirements.deviceLifespanYears || 3
        }
      },
      results: null
    };
    
    setScenarios([...scenarios, newScenario]);
    setSelectedScenarioId(newScenario.id);
  };

  // Update scenario parameter
  const updateScenarioParameter = (scenarioId: string, parameter: keyof ScenarioParameter, value: any) => {
    setScenarios(scenarios.map(scenario => {
      if (scenario.id === scenarioId) {
        const updatedScenario = {
          ...scenario,
          parameters: {
            ...scenario.parameters,
            [parameter]: value
          }
        };
        // Recalculate TCO for this scenario
        updatedScenario.results = calculateScenarioTco(updatedScenario, activeDesign);
        return updatedScenario;
      }
      return scenario;
    }));
  };

  // Update scenario name
  const updateScenarioName = (scenarioId: string, name: string) => {
    setScenarios(scenarios.map(scenario => 
      scenario.id === scenarioId ? { ...scenario, name } : scenario
    ));
  };

  // Delete scenario
  const deleteScenario = (scenarioId: string) => {
    setScenarios(scenarios.filter(scenario => scenario.id !== scenarioId));
    if (selectedScenarioId === scenarioId) {
      setSelectedScenarioId(scenarios.length > 1 ? scenarios[0].id : null);
    }
  };

  // Duplicate scenario
  const duplicateScenario = (scenarioId: string) => {
    const scenarioToDuplicate = scenarios.find(s => s.id === scenarioId);
    if (scenarioToDuplicate) {
      const newScenario: TcoScenario = {
        ...scenarioToDuplicate,
        id: `scenario-${Date.now()}`,
        name: `${scenarioToDuplicate.name} (Copy)`,
      };
      setScenarios([...scenarios, newScenario]);
      setSelectedScenarioId(newScenario.id);
    }
  };

  // Calculate all scenarios
  const calculateAllScenarios = () => {
    setScenarios(scenarios.map(scenario => ({
      ...scenario,
      results: calculateScenarioTco(scenario, activeDesign)
    })));
  };

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>TCO Sensitivity Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="sensitivity">Sensitivity</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="space-y-4">
            <div className="flex justify-between items-center">
              <Button onClick={createScenario} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Scenario
              </Button>
              <Button onClick={calculateAllScenarios} variant="outline" size="sm">
                Calculate All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Scenario List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Scenarios</h4>
                {scenarios.map(scenario => (
                  <div
                    key={scenario.id}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedScenarioId === scenario.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedScenarioId(scenario.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{scenario.name}</p>
                        {scenario.results && (
                          <p className="text-xs text-gray-600">
                            TCO/VM: ${scenario.results.tcoPerVM.toFixed(2)}/mo
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateScenario(scenario.id);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScenario(scenario.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scenario Parameters */}
              {selectedScenario && (
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <Label>Scenario Name</Label>
                    <Input
                      value={selectedScenario.name}
                      onChange={(e) => updateScenarioName(selectedScenario.id, e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Compute Scale Factor</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[selectedScenario.parameters.computeScale]}
                          onValueChange={([value]) => 
                            updateScenarioParameter(selectedScenario.id, 'computeScale', value)
                          }
                          min={0.1}
                          max={5.0}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-sm w-12 text-right">
                          {selectedScenario.parameters.computeScale.toFixed(1)}x
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label>Storage Scale Factor</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[selectedScenario.parameters.storageScale]}
                          onValueChange={([value]) => 
                            updateScenarioParameter(selectedScenario.id, 'storageScale', value)
                          }
                          min={0.1}
                          max={5.0}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-sm w-12 text-right">
                          {selectedScenario.parameters.storageScale.toFixed(1)}x
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label>Utilization %</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[selectedScenario.parameters.utilization]}
                          onValueChange={([value]) => 
                            updateScenarioParameter(selectedScenario.id, 'utilization', value)
                          }
                          min={10}
                          max={100}
                          step={5}
                          className="flex-1"
                        />
                        <span className="text-sm w-12 text-right">
                          {selectedScenario.parameters.utilization}%
                        </span>
                      </div>
                    </div>

                    <div>
                      <Label>Availability Zones</Label>
                      <Input
                        type="number"
                        value={selectedScenario.parameters.availabilityZones}
                        onChange={(e) => 
                          updateScenarioParameter(selectedScenario.id, 'availabilityZones', parseInt(e.target.value))
                        }
                        min={1}
                        max={16}
                      />
                    </div>

                    <div>
                      <Label>Rack Quantity</Label>
                      <Input
                        type="number"
                        value={selectedScenario.parameters.rackQuantity}
                        onChange={(e) => 
                          updateScenarioParameter(selectedScenario.id, 'rackQuantity', parseInt(e.target.value))
                        }
                        min={1}
                        max={100}
                      />
                    </div>

                    <div>
                      <Label>Power Efficiency Factor</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[selectedScenario.parameters.powerEfficiency]}
                          onValueChange={([value]) => 
                            updateScenarioParameter(selectedScenario.id, 'powerEfficiency', value)
                          }
                          min={0.5}
                          max={2.0}
                          step={0.1}
                          className="flex-1"
                        />
                        <span className="text-sm w-12 text-right">
                          {selectedScenario.parameters.powerEfficiency.toFixed(1)}x
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Results Display */}
                  {selectedScenario.results && (
                    <div className="mt-6 p-4 bg-gray-50 rounded">
                      <h4 className="font-medium mb-3">Scenario Results</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">TCO per VM:</span>
                          <p className="font-medium">${selectedScenario.results.tcoPerVM.toFixed(2)}/month</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Monthly Cost:</span>
                          <p className="font-medium">${selectedScenario.results.totalMonthlyCost.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">VM Capacity:</span>
                          <p className="font-medium">{selectedScenario.results.vmCapacity.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Cost per TB:</span>
                          <p className="font-medium">${selectedScenario.results.costPerTB.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <ScenarioComparisonChart scenarios={scenarios} />
          </TabsContent>

          <TabsContent value="sensitivity">
            <ParameterSensitivityChart 
              scenarios={scenarios}
              baseScenarioId={selectedScenarioId || scenarios[0]?.id}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 