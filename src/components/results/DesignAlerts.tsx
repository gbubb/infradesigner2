
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface DesignError {
  id: string;
  title: string;
  description: string;
}

interface DesignAlertsProps {
  errors: DesignError[];
  hasNoDesign: boolean;
}

export const DesignAlerts: React.FC<DesignAlertsProps> = ({ errors, hasNoDesign }) => {
  return (
    <>
      {hasNoDesign && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No design data available</AlertTitle>
          <AlertDescription>
            Please assign components to roles in the Design tab and then click "Recalculate Design" to see results.
          </AlertDescription>
        </Alert>
      )}
      
      {errors.length > 0 && (
        <div className="mb-6 space-y-4">
          {errors.map(error => (
            <Alert key={error.id} variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{error.title}</AlertTitle>
              <AlertDescription>{error.description}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}
    </>
  );
};
