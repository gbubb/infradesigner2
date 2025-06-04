
import React from 'react';
import { BillOfMaterialsTab } from '@/components/results/tabs/BillOfMaterialsTab';

export const ProcurePanel: React.FC = () => {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Procurement</h1>
          <p className="text-muted-foreground mt-2">
            Manage bill of materials and procurement workflows for your infrastructure design.
          </p>
        </div>
        
        <BillOfMaterialsTab />
      </div>
    </div>
  );
};
