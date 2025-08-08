import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VMPricing } from '@/services/pricing/pricingModelService';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface PricingSampleTableProps {
  prices: VMPricing[];
}

export const PricingSampleTable: React.FC<PricingSampleTableProps> = ({ prices }) => {
  const getVMSizeName = (vCPU: number, memory: number) => {
    const sizeMap: { [key: string]: string } = {
      '1-2': 'Micro',
      '2-4': 'Small',
      '4-8': 'Medium',
      '8-16': 'Large',
      '16-32': 'XLarge',
      '32-64': '2XLarge',
      '48-96': '3XLarge',
      '64-128': '4XLarge',
    };
    
    const key = `${vCPU}-${memory}`;
    return sizeMap[key] || 'Custom';
  };

  const getSizeBadgeColor = (vCPU: number) => {
    if (vCPU <= 2) return 'default';
    if (vCPU <= 8) return 'secondary';
    if (vCPU <= 16) return 'outline';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sample VM Pricing</CardTitle>
        <CardDescription>
          Common VM sizes with calculated monthly pricing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Size</TableHead>
              <TableHead className="text-center">vCPUs</TableHead>
              <TableHead className="text-center">Memory (GB)</TableHead>
              <TableHead className="text-right">Hourly</TableHead>
              <TableHead className="text-right">Monthly</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  Ratio Penalty
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Additional cost for VMs that deviate from natural CPU:Memory ratio</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
              <TableHead className="text-right">Cost Breakdown</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((price, index) => {
              const sizeName = getVMSizeName(price.vCPU, price.memoryGB);
              const badgeColor = getSizeBadgeColor(price.vCPU);
              
              return (
                <TableRow key={index}>
                  <TableCell>
                    <Badge variant={badgeColor as 'default' | 'secondary' | 'outline' | 'destructive'}>{sizeName}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium">{price.vCPU}</TableCell>
                  <TableCell className="text-center font-medium">{price.memoryGB}</TableCell>
                  <TableCell className="text-right">{formatCurrency(price.baseHourlyPrice)}</TableCell>
                  <TableCell className="text-right font-bold">{formatCurrency(price.monthlyPrice)}</TableCell>
                  <TableCell className="text-center">
                    <span className={`text-sm ${price.breakdown.sizePenalty > 0.2 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                      +{(price.breakdown.sizePenalty * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            View Details
                          </button>
                        </TooltipTrigger>
                        <TooltipContent align="end" className="w-64">
                          <div className="space-y-2 text-sm">
                            <div className="font-medium mb-2">Cost Components</div>
                            <div className="flex justify-between">
                              <span>Compute:</span>
                              <span>{formatCurrency(price.breakdown.computeCost)}/hr</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Network:</span>
                              <span>{formatCurrency(price.breakdown.networkCost)}/hr</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Licensing:</span>
                              <span>{formatCurrency(price.breakdown.licensingCost)}/hr</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span>HA Overhead:</span>
                              <span>{price.breakdown.haOverheadMultiplier.toFixed(2)}x</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Size Penalty:</span>
                              <span>+{(price.breakdown.sizePenalty * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between font-medium border-t pt-2">
                              <span>Effective Margin:</span>
                              <span className="text-green-600">
                                {(price.breakdown.effectiveMargin * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Prices include all infrastructure costs (compute, network, licensing) 
            and account for high availability overhead. Larger VMs incur a size penalty to reflect 
            scheduling and packing inefficiencies.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};