import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { CostBreakdownChart } from './charts/CostBreakdownChart';
import { PowerCapacityWaterfall } from './charts/PowerCapacityWaterfall';
import { UtilizationHeatmap } from './charts/UtilizationHeatmap';
import { CostMetricsDashboard } from './dashboards/CostMetricsDashboard';
import { PUETrendingChart } from './charts/PUETrendingChart';
import { CapacityPlanningView } from './views/CapacityPlanningView';
import { DatacenterCostCalculator } from '@/services/datacenter/DatacenterCostCalculator';
import { PowerEfficiencyCalculator } from '@/services/datacenter/PowerEfficiencyCalculator';
import { CapacityManagementService } from '@/services/datacenter/CapacityManagementService';

export const DatacenterAnalyticsTab: React.FC = () => {
  const { requirements, activeDesign } = useDesignStore();
  const selectedFacilityId = requirements.physicalConstraints?.selectedFacilityId;

  // Mock facility data until we integrate with the backend
  const mockFacility = useMemo(() => {
    if (!selectedFacilityId || selectedFacilityId === 'none') return null;
    
    // This would come from the database in production
    return {
      id: selectedFacilityId,
      name: 'Primary Datacenter',
      location: 'Northern Virginia',
      powerInfrastructure: [
        { id: 'grid', name: 'Grid Input', capacityKW: 10000, efficiency: 1.0 },
        { id: 'ups', name: 'UPS System', capacityKW: 8000, efficiency: 0.95, parentLayerId: 'grid' },
        { id: 'pdu', name: 'PDU', capacityKW: 7600, efficiency: 0.98, parentLayerId: 'ups' },
        { id: 'rack', name: 'Rack PDU', capacityKW: 7400, efficiency: 0.99, parentLayerId: 'pdu' }
      ],
      costLayers: [
        { id: 'real-estate', name: 'Real Estate', type: 'capital' as const, amount: 50000000, currency: 'USD', amortizationMonths: 360, allocationMethod: 'per-rack' as const },
        { id: 'building', name: 'Building Infrastructure', type: 'capital' as const, amount: 30000000, currency: 'USD', amortizationMonths: 240, allocationMethod: 'per-rack' as const },
        { id: 'power-infra', name: 'Power Infrastructure', type: 'capital' as const, amount: 20000000, currency: 'USD', amortizationMonths: 180, allocationMethod: 'per-kw' as const },
        { id: 'cooling', name: 'Cooling Systems', type: 'capital' as const, amount: 15000000, currency: 'USD', amortizationMonths: 120, allocationMethod: 'per-kw' as const },
        { id: 'operations', name: 'Operations', type: 'operational' as const, amount: 500000, currency: 'USD', frequency: 'monthly' as const, allocationMethod: 'hybrid' as const }
      ],
      constraints: {
        totalRacks: 500,
        totalPowerKW: 7400,
        totalSpaceSqFt: 50000
      }
    };
  }, [selectedFacilityId]);

  // Calculate analytics using the services
  const analytics = useMemo(() => {
    if (!mockFacility || !activeDesign) return null;

    // Calculate current usage from rack profiles
    const currentRacks = activeDesign.rackprofiles?.length || 0;
    const currentPowerKW = activeDesign.components?.reduce((sum, component) => {
      const power = ('power' in component ? component.power : 0) || 
                    ('powerrequired' in component ? component.powerrequired : 0) || 0;
      const quantity = component.quantity || 1;
      return sum + (power * quantity) / 1000; // Convert W to kW
    }, 0) || 0;

    // Create mock racks for the services (since we don't have the Rack type)
    const mockRacks = activeDesign.rackprofiles?.map(profile => ({
      id: profile.id,
      name: profile.name,
      placedComponents: activeDesign.components.filter(c => {
        // Check if component is placed in this rack
        if (!profile.devices) return false;
        return profile.devices.some(d => d.deviceId === c.id);
      }).map(c => ({
        ...c,
        power: ('power' in c ? c.power : 0) || 
               ('powerrequired' in c ? c.powerrequired : 0) || 0
      }))
    })) || [];

    // Create mock datacenter racks for cost calculator
    const mockDatacenterRacks = activeDesign.rackprofiles?.map(profile => ({
      id: profile.id,
      name: profile.name,
      facilityId: mockFacility.id,
      hierarchyLevelId: profile.hierarchyLevelId || '',
      positionInLevel: profile.positionInLevel || 0,
      powerAllocationKw: profile.powerAllocationKw || 0,
      actualPowerUsageKw: profile.actualPowerUsageKw || 0,
      mappedRack: profile,
      assignmentDate: new Date().toISOString(),
      physicalLocation: profile.physicalLocation || {}
    })) || [];

    // Initialize services with proper parameters
    const costCalculator = new DatacenterCostCalculator(mockFacility, mockDatacenterRacks);
    const powerCalculator = new PowerEfficiencyCalculator(mockFacility, mockRacks);
    const capacityService = new CapacityManagementService(mockFacility, mockRacks);

    // Calculate costs
    const costBreakdown = costCalculator.calculateFacilityCosts();

    // Calculate power efficiency
    const powerEfficiency = powerCalculator.calculateEfficiencyMetrics();

    // Calculate capacity utilization
    const utilization = capacityService.calculateCapacityMetrics();

    return {
      costBreakdown,
      powerEfficiency,
      pue: powerEfficiency.pue,
      utilization,
      currentUsage: {
        racks: currentRacks,
        powerKW: currentPowerKW
      },
      capacity: mockFacility.constraints
    };
  }, [mockFacility, activeDesign]);

  if (!selectedFacilityId || selectedFacilityId === 'none' || selectedFacilityId === 'colocation') {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Datacenter analytics are only available when using an owned facility. 
            Please select or create a facility in the Requirements panel.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analytics || !mockFacility) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Loading datacenter analytics...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cost Metrics Dashboard */}
      <CostMetricsDashboard 
        costBreakdown={analytics.costBreakdown}
        utilization={analytics.utilization}
        currentUsage={analytics.currentUsage}
        capacity={analytics.capacity}
      />

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown by Layer</CardTitle>
            <CardDescription>
              Monthly cost allocation across infrastructure layers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CostBreakdownChart costLayers={analytics.costBreakdown} />
          </CardContent>
        </Card>

        {/* Power Capacity Waterfall */}
        <Card>
          <CardHeader>
            <CardTitle>Power Capacity Cascade</CardTitle>
            <CardDescription>
              Available power at each infrastructure layer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PowerCapacityWaterfall 
              powerLayers={mockFacility.powerInfrastructure}
              currentUsageKW={analytics.currentUsage.powerKW}
            />
          </CardContent>
        </Card>

        {/* Utilization Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Resource Utilization</CardTitle>
            <CardDescription>
              Current usage vs available capacity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UtilizationHeatmap 
              utilization={analytics.utilization}
              facility={mockFacility}
            />
          </CardContent>
        </Card>

        {/* PUE Trending */}
        <Card>
          <CardHeader>
            <CardTitle>PUE Analysis</CardTitle>
            <CardDescription>
              Power Usage Effectiveness trends and targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PUETrendingChart 
              currentPUE={analytics.pue.total}
              targetPUE={1.5}
              breakdown={analytics.pue.breakdown}
            />
          </CardContent>
        </Card>
      </div>

      {/* Capacity Planning Section */}
      <Card>
        <CardHeader>
          <CardTitle>Capacity Planning</CardTitle>
          <CardDescription>
            Available capacity and growth projections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CapacityPlanningView 
            currentUsage={analytics.currentUsage}
            capacity={analytics.capacity}
            powerInfrastructure={mockFacility.powerInfrastructure}
          />
        </CardContent>
      </Card>
    </div>
  );
};