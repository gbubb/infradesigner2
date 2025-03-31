
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDesignStore } from '@/store/designStore';

export const DesignProperties: React.FC = () => {
  const { activeDesign, createNewDesign, saveDesign } = useDesignStore();
  const [designName, setDesignName] = useState('');
  const [designDescription, setDesignDescription] = useState('');

  useEffect(() => {
    // Set design name from active design if it exists
    if (activeDesign) {
      setDesignName(activeDesign.name);
      setDesignDescription(activeDesign.description || '');
    }
  }, [activeDesign]);

  const handleCreateDesign = () => {
    createNewDesign(designName || "New Design", designDescription);
  };

  const handleUpdateDesign = () => {
    saveDesign();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Design Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="design-name">Name</Label>
            <Input
              id="design-name"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="Enter design name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="design-description">Description</Label>
            <Input 
              id="design-description"
              value={designDescription}
              onChange={(e) => setDesignDescription(e.target.value)}
              placeholder="Enter design description"
            />
          </div>
          
          <div className="pt-2">
            {!activeDesign ? (
              <Button onClick={handleCreateDesign} disabled={!designName}>
                Create Design
              </Button>
            ) : (
              <Button onClick={handleUpdateDesign}>
                Update Design Properties
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
