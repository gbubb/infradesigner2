
import React from 'react';
import { ResultsTabs } from './tabs/ResultsTabs';

interface DesignError {
  id: string;
  title: string;
  description: string;
}

interface DesignResultsContentProps {
  designErrors: DesignError[];
  hasNoDesign: boolean;
}

export const DesignResultsContent: React.FC<DesignResultsContentProps> = ({ 
  designErrors,
  hasNoDesign
}) => {
  return <ResultsTabs designErrors={designErrors} hasNoDesign={hasNoDesign} />;
};
