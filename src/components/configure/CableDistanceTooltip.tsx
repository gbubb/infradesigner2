import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CableDistanceBreakdown } from "@/types/infrastructure/cable-settings-types";

interface CableDistanceTooltipProps {
  distanceMm: string | number;
  breakdown?: CableDistanceBreakdown | null;
}

export function CableDistanceTooltip({ distanceMm, breakdown }: CableDistanceTooltipProps) {
  if (!breakdown) {
    return <span>{distanceMm}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted">{distanceMm}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <div className="font-semibold">{breakdown.description}</div>
            <div className="text-sm space-y-1">
              {breakdown.components.verticalDistanceMm !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vertical distance:</span>
                  <span className="font-mono">{breakdown.components.verticalDistanceMm.toFixed(0)}mm</span>
                </div>
              )}
              {breakdown.components.orientationAdjustmentMm !== undefined && breakdown.components.orientationAdjustmentMm > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Front-to-rear routing:</span>
                  <span className="font-mono">{breakdown.components.orientationAdjustmentMm.toFixed(0)}mm</span>
                </div>
              )}
              {breakdown.components.horizontalDistanceMm !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horizontal distance:</span>
                  <span className="font-mono">{breakdown.components.horizontalDistanceMm.toFixed(0)}mm</span>
                </div>
              )}
              {breakdown.components.cableHeightTraversalMm !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overhead routing:</span>
                  <span className="font-mono">{breakdown.components.cableHeightTraversalMm.toFixed(0)}mm</span>
                </div>
              )}
              {breakdown.components.slackAllowanceMm !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slack allowance:</span>
                  <span className="font-mono">{breakdown.components.slackAllowanceMm.toFixed(0)}mm</span>
                </div>
              )}
              {breakdown.components.intraRackRoutingMm !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cable management:</span>
                  <span className="font-mono">{breakdown.components.intraRackRoutingMm.toFixed(0)}mm</span>
                </div>
              )}
              <div className="border-t pt-1 flex justify-between font-semibold">
                <span>Total:</span>
                <span className="font-mono">{breakdown.totalMillimeters.toFixed(0)}mm ({breakdown.totalMeters}m)</span>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}