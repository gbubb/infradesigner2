import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';
import { ClusterParams } from './types';

interface ScenarioParametersProps {
  scenarioMonths: number;
  setScenarioMonths: (months: number) => void;
  clusterParameters: Record<string, ClusterParams>;
  pricingOverrides: Record<string, number>;
  computePricing: Array<{
    clusterId: string;
    clusterName: string;
    pricePerMonth: number;
  }>;
  storagePricing: Array<{
    clusterId: string;
    clusterName: string;
    pricePerMonth: number;
  }>;
  updateClusterParameter: (clusterId: string, field: string, value: number | string) => void;
  updatePricingOverride: (clusterId: string, price: number) => void;
}

const GrowthModelParams: React.FC<{
  params: ClusterParams;
  clusterId: string;
  updateParameter: (clusterId: string, field: string, value: number | string) => void;
}> = ({ params, clusterId, updateParameter }) => {
  if (params?.growthModel === 'compound') {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs">Rate %:</Label>
        <Input
          type="number"
          min={0}
          max={50}
          step={0.1}
          value={params?.growthRate || 2}
          onChange={(e) => updateParameter(clusterId, 'growthRate', Number(e.target.value))}
          className="w-16"
        />
      </div>
    );
  }
  
  if (params?.growthModel === 'logistic') {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-xs">Inflect:</Label>
        <Input
          type="number"
          min={1}
          max={60}
          value={params?.inflectionMonth || 12}
          onChange={(e) => updateParameter(clusterId, 'inflectionMonth', Number(e.target.value))}
          className="w-16"
        />
        <Label className="text-xs">Rate:</Label>
        <Input
          type="number"
          min={0.1}
          max={2}
          step={0.1}
          value={params?.growthRate || 0.5}
          onChange={(e) => updateParameter(clusterId, 'growthRate', Number(e.target.value))}
          className="w-16"
        />
      </div>
    );
  }
  
  if (params?.growthModel === 'phased') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1">
          <span className="text-xs w-6">P1:</span>
          <Input
            type="number"
            min={1}
            max={24}
            value={params?.phase1Duration || 6}
            onChange={(e) => updateParameter(clusterId, 'phase1Duration', Number(e.target.value))}
            className="w-10 h-6 text-xs"
            title="Phase 1 Duration (months)"
          />
          <span className="text-xs">mo</span>
          <Input
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={params?.phase1Rate || 1.5}
            onChange={(e) => updateParameter(clusterId, 'phase1Rate', Number(e.target.value))}
            className="w-12 h-6 text-xs"
            title="Phase 1 Rate (%/mo)"
          />
          <span className="text-xs">%/mo</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs w-6">P2:</span>
          <Input
            type="number"
            min={1}
            max={24}
            value={params?.phase2Duration || 12}
            onChange={(e) => updateParameter(clusterId, 'phase2Duration', Number(e.target.value))}
            className="w-10 h-6 text-xs"
            title="Phase 2 Duration (months)"
          />
          <span className="text-xs">mo</span>
          <Input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={params?.phase2Rate || 4}
            onChange={(e) => updateParameter(clusterId, 'phase2Rate', Number(e.target.value))}
            className="w-12 h-6 text-xs"
            title="Phase 2 Rate (%/mo compound)"
          />
          <span className="text-xs">%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs w-6">P3:</span>
          <Input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={params?.phase3Rate || 0.5}
            onChange={(e) => updateParameter(clusterId, 'phase3Rate', Number(e.target.value))}
            className="w-12 h-6 text-xs"
            title="Phase 3 Decay Rate"
          />
          <span className="text-xs">decay</span>
        </div>
      </div>
    );
  }
  
  return null;
};

export const ScenarioParameters: React.FC<ScenarioParametersProps> = ({
  scenarioMonths,
  setScenarioMonths,
  clusterParameters,
  pricingOverrides,
  computePricing,
  storagePricing,
  updateClusterParameter,
  updatePricingOverride
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Parameters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label htmlFor="scenario-months">Scenario Length (months)</Label>
          <Input
            id="scenario-months"
            type="number"
            min={1}
            max={120}
            value={scenarioMonths}
            onChange={(e) => setScenarioMonths(Number(e.target.value))}
            className="w-48"
          />
        </div>
        
        {/* Cluster Parameters Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cluster Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Growth Model</TableHead>
                <TableHead>Start %</TableHead>
                <TableHead>Target %</TableHead>
                <TableHead>Model Params</TableHead>
                <TableHead>Price Override</TableHead>
                <TableHead>Overalloc</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Compute Clusters */}
              {computePricing && computePricing.map(cluster => {
                const params = clusterParameters[cluster.clusterId];
                return (
                  <TableRow key={cluster.clusterId}>
                    <TableCell className="font-medium">{cluster.clusterName}</TableCell>
                    <TableCell>Compute</TableCell>
                    <TableCell>
                      <Select
                        value={params?.growthModel || 'logistic'}
                        onValueChange={(value) => updateClusterParameter(cluster.clusterId, 'growthModel', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compound">Compound</SelectItem>
                          <SelectItem value="logistic">S-Curve</SelectItem>
                          <SelectItem value="phased">3-Phase</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={params?.startUtilization || 10}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'startUtilization', Number(e.target.value))}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={params?.targetUtilization || 85}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'targetUtilization', Number(e.target.value))}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <GrowthModelParams 
                        params={params} 
                        clusterId={cluster.clusterId} 
                        updateParameter={updateClusterParameter} 
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={pricingOverrides[cluster.clusterId] || cluster.pricePerMonth}
                        onChange={(e) => updatePricingOverride(cluster.clusterId, Number(e.target.value))}
                        className="w-24"
                      />
                      <p className="text-xs text-muted-foreground">Per VM</p>
                    </TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                );
              })}
              
              {/* Storage Clusters */}
              {storagePricing && storagePricing.map(cluster => {
                const params = clusterParameters[cluster.clusterId];
                return (
                  <TableRow key={cluster.clusterId}>
                    <TableCell className="font-medium">{cluster.clusterName}</TableCell>
                    <TableCell>Storage</TableCell>
                    <TableCell>
                      <Select
                        value={params?.growthModel || 'logistic'}
                        onValueChange={(value) => updateClusterParameter(cluster.clusterId, 'growthModel', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compound">Compound</SelectItem>
                          <SelectItem value="logistic">S-Curve</SelectItem>
                          <SelectItem value="phased">3-Phase</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={params?.startUtilization || 10}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'startUtilization', Number(e.target.value))}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={params?.targetUtilization || 85}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'targetUtilization', Number(e.target.value))}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <GrowthModelParams 
                        params={params} 
                        clusterId={cluster.clusterId} 
                        updateParameter={updateClusterParameter} 
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={pricingOverrides[cluster.clusterId] || cluster.pricePerMonth}
                        onChange={(e) => updatePricingOverride(cluster.clusterId, Number(e.target.value))}
                        className="w-24"
                      />
                      <p className="text-xs text-muted-foreground">Per GiB</p>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0.1}
                        max={10}
                        step={0.1}
                        value={params?.overallocationRatio || 1.0}
                        onChange={(e) => updateClusterParameter(cluster.clusterId, 'overallocationRatio', Number(e.target.value))}
                        className="w-16"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {/* Growth Model Descriptions */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Compound:</strong> Traditional exponential growth at a constant rate</p>
              <p><strong>S-Curve (Logistic):</strong> Slow start, rapid middle growth, then plateaus - typical for technology adoption</p>
              <p><strong>3-Phase:</strong> Linear start (pilot), exponential middle (rollout), logarithmic end (maturity)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};