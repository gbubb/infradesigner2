
import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  message = "Calculating design results..." 
}) => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};
