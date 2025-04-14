import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { DesignDebugDialog } from './DesignDebugDialog';

// Get build timestamp from environment variable (assuming Vite)
const buildTimestamp = import.meta.env.VITE_BUILD_TIMESTAMP || 'N/A';

interface ResultsHeaderProps {
  onRecalculate: () => void;
  onForceFullRecalculation: () => void;
}

export const ResultsHeader: React.FC<ResultsHeaderProps> = ({ 
  onRecalculate, 
  onForceFullRecalculation 
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-2xl font-semibold">Design Results</h2>
      <div className="flex gap-2">
        <DesignDebugDialog onForceRecalculation={onForceFullRecalculation} />
        
        <Button 
          onClick={onRecalculate} 
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Recalculate Design
        </Button>
      </div>
      {/* Display Build Timestamp */}
      <div className="absolute bottom-0 right-0 text-xs text-muted-foreground pr-2 pb-1">
        Build: {new Date(buildTimestamp).toLocaleString()}
      </div>
    </div>
  );
};
