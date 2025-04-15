
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { DesignDebugDialog } from './DesignDebugDialog';

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
    </div>
  );
};
