/**
 * VM Scaling Progress Component
 *
 * Displays progress information during VM cost scaling simulation,
 * including progress bar, current status, and estimated time remaining.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { SimulationProgress } from '@/hooks/design/useVMCostScalingAsync';

interface VMScalingProgressProps {
  progress: SimulationProgress;
  currentNodeCount: number | null;
  estimatedTimeRemaining: number | null;
  onCancel?: () => void;
}

export const VMScalingProgress: React.FC<VMScalingProgressProps> = ({
  progress,
  currentNodeCount,
  estimatedTimeRemaining
}) => {
  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds === 0) return 'Calculating...';

    if (seconds < 60) {
      return `${Math.round(seconds)} seconds`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);

    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="font-semibold text-sm">
                  Simulating Design Configurations
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {currentNodeCount !== null
                    ? `Processing ${currentNodeCount} nodes...`
                    : 'Initializing simulation...'
                  }
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {progress.current} / {progress.total}
              </p>
              <p className="text-xs text-muted-foreground">
                configurations
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress.percentage} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.percentage}% complete</span>
              <span>
                {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0
                  ? `~${formatTime(estimatedTimeRemaining)} remaining`
                  : 'Calculating time...'
                }
              </span>
            </div>
          </div>

          {/* Info Message */}
          <div className="text-xs text-muted-foreground bg-background/50 p-3 rounded border">
            <p>
              Running full design calculation for each node count to ensure accurate cost predictions.
              This may take a minute depending on configuration complexity.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
