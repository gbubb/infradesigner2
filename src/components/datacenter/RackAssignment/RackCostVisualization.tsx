import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, Server, Zap, TrendingUp } from 'lucide-react';
import { useStore } from '@/store';
import type { RackCostAllocation } from '@/types/infrastructure/datacenter-types';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useCurrency } from '@/hooks/useCurrency';

const COST_COLORS = {
  'real-estate': '#8884d8',
  'building-facility': '#82ca9d',
  'power-infrastructure': '#ffc658',
  'cooling-infrastructure': '#ff7c7c',
  'it-infrastructure': '#8dd1e1',
  'network-connectivity': '#d084d0',
  'security': '#ffb347',
  'operations': '#67b7dc',
  'maintenance': '#a4de6c',
  'utilities': '#ffd93d',
  'other': '#999999'
};

export function RackCostVisualization() {
  const { selectedFacilityId, getFacilityById, calculateRackCosts } = useStore();
  const currency = useCurrency();
  const [rackCosts, setRackCosts] = useState<RackCostAllocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRack, setSelectedRack] = useState<RackCostAllocation | null>(null);

  const facility = selectedFacilityId ? getFacilityById(selectedFacilityId) : null;

  useEffect(() => {
    const loadRackCosts = async () => {
      if (!selectedFacilityId) return;
      
      setLoading(true);
      try {
        const costs = await calculateRackCosts(selectedFacilityId);
        setRackCosts(costs);
        if (costs.length > 0) {
          setSelectedRack(costs[0]);
        }
      } catch (error) {
        console.error('Error loading rack costs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedFacilityId) {
      loadRackCosts();
    }
  }, [selectedFacilityId, calculateRackCosts]);


  if (!facility) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Please select a facility to view rack costs.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Calculating rack costs...
      </div>
    );
  }

  if (rackCosts.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No racks assigned to this facility yet.
      </div>
    );
  }

  const totalMonthlyCost = rackCosts.reduce((sum, rack) => sum + rack.costs.total.monthly, 0);
  const avgCostPerRack = totalMonthlyCost / rackCosts.length;
  
  // Calculate averages only for racks with valid values
  const racksWithValidPerU = rackCosts.filter(rack => rack.costs.total.perU > 0 && isFinite(rack.costs.total.perU));
  const avgCostPerU = racksWithValidPerU.length > 0
    ? racksWithValidPerU.reduce((sum, rack) => sum + rack.costs.total.perU, 0) / racksWithValidPerU.length
    : 0;
  
  const racksWithValidPerKw = rackCosts.filter(rack => rack.costs.total.perKw > 0 && isFinite(rack.costs.total.perKw));
  const avgCostPerKw = racksWithValidPerKw.length > 0
    ? racksWithValidPerKw.reduce((sum, rack) => sum + rack.costs.total.perKw, 0) / racksWithValidPerKw.length
    : 0;

  const costDistribution = rackCosts.map(rack => ({
    name: rack.rackName,
    cost: rack.costs.total.monthly,
    utilization: rack.utilization.powerUsedKw > 0 
      ? (rack.utilization.powerUsedKw / rack.utilization.powerAllocatedKw) * 100 
      : 0
  })).sort((a, b) => b.cost - a.cost);

  const categoryBreakdown = selectedRack ? Object.entries({
    ...selectedRack.costs.capital.breakdown,
    ...selectedRack.costs.operational.breakdown
  }).map(([category, value]) => ({
    name: category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
    category
  })).filter(item => item.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyCost, currency)}</div>
            <p className="text-xs text-muted-foreground">
              Across {rackCosts.length} racks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost per Rack</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgCostPerRack, currency)}</div>
            <p className="text-xs text-muted-foreground">
              Per month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost per U</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgCostPerU, currency)}</div>
            <p className="text-xs text-muted-foreground">
              Per rack unit per month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cost per kW</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgCostPerKw, currency)}</div>
            <p className="text-xs text-muted-foreground">
              Per kilowatt per month
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="distribution" className="space-y-4">
        <TabsList>
          <TabsTrigger value="distribution">Cost Distribution</TabsTrigger>
          <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
          <TabsTrigger value="details">Rack Details</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Distribution by Rack</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={costDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip
                      formatter={((value: number) => formatCurrency(value, currency)) as never}
                      labelFormatter={((label: unknown) => `Rack: ${label}`) as never}
                    />
                    <Bar dataKey="cost" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Cost Breakdown for {selectedRack?.rackName || 'Selected Rack'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COST_COLORS[entry.category as keyof typeof COST_COLORS] || '#999'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={((value: number) => formatCurrency(value, currency)) as never} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium mb-2">Monthly Breakdown</h4>
                  {categoryBreakdown.map(item => (
                    <div key={item.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-sm" 
                          style={{ backgroundColor: COST_COLORS[item.category as keyof typeof COST_COLORS] || '#999' }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value, currency)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between font-medium">
                      <span>Total Monthly</span>
                      <span>{formatCurrency(selectedRack?.costs.total.monthly || 0, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rack Selection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {rackCosts.map(rack => (
                    <button
                      key={rack.rackId}
                      onClick={() => setSelectedRack(rack)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedRack?.rackId === rack.rackId
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{rack.rackName}</div>
                          <div className="text-sm text-muted-foreground">
                            {rack.hierarchyPath.join(' > ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(rack.costs.total.monthly, currency)}</div>
                          <div className="text-sm text-muted-foreground">per month</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedRack && (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedRack.rackName} Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Utilization</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Power Usage</span>
                            <span>{formatNumber(selectedRack.utilization.powerUsedKw)} / {formatNumber(selectedRack.utilization.powerAllocatedKw)} kW</span>
                          </div>
                          <Progress 
                            value={(selectedRack.utilization.powerUsedKw / selectedRack.utilization.powerAllocatedKw) * 100} 
                            className="h-2"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>Space Usage</span>
                            <span>{selectedRack.utilization.usedU} / {selectedRack.utilization.totalU} U</span>
                          </div>
                          <Progress 
                            value={(selectedRack.utilization.usedU / selectedRack.utilization.totalU) * 100} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Cost Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Capital (Monthly)</span>
                          <span className="font-medium">{formatCurrency(selectedRack.costs.capital.monthly, currency)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Operational (Monthly)</span>
                          <span className="font-medium">{formatCurrency(selectedRack.costs.operational.monthly, currency)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm font-medium">Total Monthly</span>
                          <span className="font-bold">{formatCurrency(selectedRack.costs.total.monthly, currency)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Per U</span>
                          <span>{formatCurrency(selectedRack.costs.total.perU, currency)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Per kW</span>
                          <span>{formatCurrency(selectedRack.costs.total.perKw, currency)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Location</h4>
                      <Badge variant="outline" className="w-full justify-start">
                        {selectedRack.hierarchyPath.join(' → ')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}