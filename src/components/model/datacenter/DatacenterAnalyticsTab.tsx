
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
import { PowerLayer } from '@/types/infrastructure/datacenter-types';

export const DatacenterAnalyticsTab: React.FC = () => {
  const { requirements, activeDesign } = useDesignStore();
  const selectedFacilityId = requirements.physicalConstraints?.selectedFacilityId; // Fixed: use selectedFacilityId

  // Mock facility data until we integrate with the backend
  const mockFacility = useMemo(() => {
    if (!selectedFacilityId || selectedFacilityId === 'none') return null;
    
    // This would come from the database in production
    return {
      id: selectedFacilityId,
      name: 'Primary Datacenter',
      location: 'Northern Virginia',
      powerInfrastructure: [
        { id: 'grid', name: 'Grid Input', type: 'grid' as const, capacityKW: 10000, efficiency: 1.0 },
        { id: 'ups', name: 'UPS System', type: 'ups' as const, capacityKW: 8000, efficiency: 0.95, parentLayerId: 'grid' },
        { id: 'pdu', name: 'PDU', type: 'pdu' as const, capacityKW: 7600, efficiency: 0.98, parentLayerId: 'ups' },
        { id: 'rack', name: 'Rack PDU', type: 'rack' as const, capacityKW: 7400, efficiency: 0.99, parentLayerId: 'pdu' }
      ] as PowerLayer[],
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

    const costCalculator = new DatacenterCostCalculator();
    const powerCalculator = new PowerEfficiencyCalculator();
    const capacityService = new CapacityManagementService();

    // Calculate current usage - Fixed: use rackprofiles instead of racks
    const currentRacks = activeDesign.rackprofiles?.length || 0;
    const currentPowerKW = activeDesign.rackprofiles?.reduce((sum, rack) => {
      const components = activeDesign.components.filter(c => {
        // Check if component is in this rack by checking device placement
        const isInRack = rack.devices.some(device => device.deviceId === c.id);
        return isInRack;
      });
      return sum + components.reduce((rackSum, component) => {
        // Fixed: use powerRequired instead of powerConsumption
        return rackSum + ((component.powerRequired || 0) * (component.quantity || 1)) / 1000;
      }, 0);
    }, 0) || 0;

    // Calculate costs
    const costBreakdown = costCalculator.calculateCostAllocation(
      mockFacility.costLayers,
      currentRacks,
      mockFacility.constraints.totalRacks,
      currentPowerKW,
      mockFacility.constraints.totalPowerKW
    );

    // Calculate power efficiency
    const powerEfficiency = powerCalculator.calculateCascadedEfficiency(
      mockFacility.powerInfrastructure
    );

    const pue = powerCalculator.calculatePUE(
      currentPowerKW,
      currentPowerKW * 0.3, // Mock cooling load (30% of IT load)
      currentPowerKW * 0.1  // Mock other loads (10% of IT load)
    );

    // Calculate capacity utilization
    const utilization = capacityService.calculateUtilization(
      currentRacks,
      mockFacility.constraints.totalRacks,
      currentPowerKW,
      mockFacility.constraints.totalPowerKW
    );

    return {
      costBreakdown,
      powerEfficiency,
      pue,
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
            <CostBreakdownChart costLayers={analytics.costBreakdown.layers} />
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
              breakdown={{
                itLoad: analytics.pue.breakdown.itLoad,
                coolingLoad: analytics.pue.breakdown.coolingLoad,
                powerLosses: 0, // Added missing powerLosses property
                otherLoads: analytics.pue.breakdown.otherLoads
              }}
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
