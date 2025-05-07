
import React from 'react';
import { ResultsTabs } from './tabs/ResultsTabs';

interface DesignResultsContentProps {
  designErrors: any[];
  hasNoDesign: boolean;
}

export const DesignResultsContent: React.FC<DesignResultsContentProps> = ({ 
  designErrors,
  hasNoDesign
}) => {
  return <ResultsTabs designErrors={designErrors} hasNoDesign={hasNoDesign} />;
};
