
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDesignStore } from '@/store/designStore';

export const DesignProperties: React.FC = () => {
  const { activeDesign, savedDesigns, createNewDesign, saveDesign, loadDesign } = useDesignStore();
  const [designName, setDesignName] = useState('');
  const [designDescription, setDesignDescription] = useState('');
  const [selectedDesignId, setSelectedDesignId] = useState<string>('');

  useEffect(() => {
    // Set design name from active design if it exists
    if (activeDesign) {
      setDesignName(activeDesign.name);
      setDesignDescription(activeDesign.description || '');
      setSelectedDesignId(activeDesign.id);
    }
  }, [activeDesign]);

  const handleCreateDesign = () => {
    createNewDesign(designName || "New Design", designDescription);
  };

  const handleUpdateDesign = () => {
    saveDesign();
  };

  const handleLoadDesign = (id: string) => {
    if (id) {
      loadDesign(id);
    }
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
          
          {savedDesigns.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="load-design">Load Saved Design</Label>
              <Select
                value={selectedDesignId}
                onValueChange={(value) => handleLoadDesign(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a design" />
                </SelectTrigger>
                <SelectContent>
                  {savedDesigns.map(design => (
                    <SelectItem key={design.id} value={design.id}>
                      {design.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
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
