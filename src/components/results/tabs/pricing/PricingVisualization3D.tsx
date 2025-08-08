import React, { useState, useMemo, useEffect } from 'react';
import { PricingModelService } from '@/services/pricing/pricingModelService';
import { Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import Plot from 'react-plotly.js';

interface PricingVisualization3DProps {
  pricingService: PricingModelService;
}

export const PricingVisualization3D: React.FC<PricingVisualization3DProps> = ({ 
  pricingService 
}) => {
  const [maxVCPU, setMaxVCPU] = useState(64);
  const [maxMemory, setMaxMemory] = useState(256);
  const [step, setStep] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is enabled
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);

  const plotData = useMemo(() => {
    setIsLoading(true);
    const rawData = pricingService.generate3DPricingData(maxVCPU, maxMemory, step);
    
    // Filter out infeasible ratios (more than 12:1 in either direction)
    const filteredData = {
      x: rawData.x,
      y: rawData.y,
      z: rawData.z.map((row, yIndex) => 
        row.map((value, xIndex) => {
          const vCPUs = rawData.x[xIndex];
          const memoryGB = rawData.y[yIndex];
          const ratio = vCPUs / memoryGB;
          
          // Cut off at 12:1 ratio in either direction
          // CPU-heavy: ratio > 3 (e.g., 12 vCPUs with 4 GB)
          // Memory-heavy: ratio < 1/12 (e.g., 1 vCPU with 12+ GB)
          if (ratio > 3 || ratio < 1/12) {
            return null; // Will appear as a gap in the surface
          }
          return value;
        })
      )
    };
    
    setIsLoading(false);
    return filteredData;
  }, [pricingService, maxVCPU, maxMemory, step]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-3 gap-6 p-4 bg-muted/50 rounded-lg">
        <div className="space-y-2">
          <Label htmlFor="maxVCPU">Max vCPUs: {maxVCPU}</Label>
          <Slider
            id="maxVCPU"
            min={8}
            max={128}
            step={8}
            value={[maxVCPU]}
            onValueChange={([value]) => setMaxVCPU(value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxMemory">Max Memory: {maxMemory} GB</Label>
          <Slider
            id="maxMemory"
            min={16}
            max={512}
            step={16}
            value={[maxMemory]}
            onValueChange={([value]) => setMaxMemory(value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="resolution">Resolution Step: {step}</Label>
          <Slider
            id="resolution"
            min={1}
            max={8}
            step={1}
            value={[step]}
            onValueChange={([value]) => setStep(value)}
          />
        </div>
      </div>

      {/* 3D Surface Plot */}
      <div className="w-full h-[600px] bg-card rounded-lg border">
        <Plot
          data={[
            {
              type: 'surface',
              x: plotData.x,
              y: plotData.y,
              z: plotData.z,
              colorscale: [
                [0, '#10b981'],     // Green
                [0.25, '#84cc16'],  // Lime
                [0.5, '#eab308'],   // Yellow
                [0.75, '#f97316'],  // Orange
                [1, '#ef4444']      // Red
              ],
              contours: {
                z: {
                  show: true,
                  usecolormap: true,
                  highlightcolor: '#42f866',
                  project: { z: true }
                }
              },
              hoverlabel: {
                bgcolor: '#1f2937',
                bordercolor: '#374151',
                font: { color: '#f3f4f6' }
              },
              hovertemplate: 
                '<b>vCPUs:</b> %{x}<br>' +
                '<b>Memory:</b> %{y} GB<br>' +
                '<b>Monthly Price:</b> $%{z:,.2f}<br>' +
                '<extra></extra>',
              name: 'VM Pricing'
            }
          ]}
          layout={{
            title: {
              text: 'VM Instance Pricing Model',
              font: { size: 16 }
            },
            autosize: true,
            height: 600,
            scene: {
              xaxis: {
                title: 'vCPUs',
                titlefont: { size: 12, color: isDarkMode ? '#f3f4f6' : '#1f2937' },
                gridcolor: isDarkMode ? '#374151' : '#e5e7eb',
                showbackground: true,
                backgroundcolor: isDarkMode ? '#1f2937' : '#f9fafb',
                tickfont: { color: isDarkMode ? '#f3f4f6' : '#1f2937' }
              },
              yaxis: {
                title: 'Memory (GB)',
                titlefont: { size: 12, color: isDarkMode ? '#f3f4f6' : '#1f2937' },
                gridcolor: isDarkMode ? '#374151' : '#e5e7eb',
                showbackground: true,
                backgroundcolor: isDarkMode ? '#1f2937' : '#f9fafb',
                tickfont: { color: isDarkMode ? '#f3f4f6' : '#1f2937' }
              },
              zaxis: {
                title: 'Monthly Price ($)',
                titlefont: { size: 12, color: isDarkMode ? '#f3f4f6' : '#1f2937' },
                gridcolor: isDarkMode ? '#374151' : '#e5e7eb',
                showbackground: true,
                backgroundcolor: isDarkMode ? '#1f2937' : '#f9fafb',
                tickformat: '$,.0f',
                tickfont: { color: isDarkMode ? '#f3f4f6' : '#1f2937' }
              },
              camera: {
                eye: { x: 1.5, y: 1.5, z: 1.5 },
                center: { x: 0, y: 0, z: 0 }
              },
              aspectratio: { x: 1, y: 1, z: 0.7 },
              aspectmode: 'manual'
            },
            paper_bgcolor: 'transparent',
            plot_bgcolor: isDarkMode ? '#1f2937' : '#ffffff',
            font: { color: isDarkMode ? '#f3f4f6' : '#1f2937' },
            margin: { l: 0, r: 0, t: 40, b: 0 },
            showlegend: false,
            hovermode: 'closest'
          }}
          config={{
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            displaylogo: false,
            toImageButtonOptions: {
              format: 'png',
              filename: 'vm_pricing_model',
              height: 1200,
              width: 1600,
              scale: 2
            }
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Price Scaling Pattern
          </h4>
          <p className="text-sm text-muted-foreground">
            Prices increase non-linearly with VM size due to the size premium. 
            Larger VMs incur additional costs to account for scheduling and packing inefficiencies.
          </p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
          <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
            Optimal VM Sizes
          </h4>
          <p className="text-sm text-muted-foreground">
            Best value typically found in small to medium VMs (2-8 vCPUs). 
            Consider workload consolidation vs. larger instance premiums.
          </p>
        </div>
      </div>
    </div>
  );
};