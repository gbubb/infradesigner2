import React, { useState } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowRight, BarChart } from 'lucide-react';
import { DesignComparison } from './DesignComparison';

export const ComparePanel: React.FC = () => {
  const { savedDesigns, activeDesign } = useDesignStore();
  const [designA, setDesignA] = useState<string | null>(activeDesign?.id || null);
  const [designB, setDesignB] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  // Filter out designs that are already selected
  const availableDesignsForA = savedDesigns;
  const availableDesignsForB = savedDesigns.filter(design => design.id !== designA);
  
  // Get the full design objects
  const designAObject = savedDesigns.find(design => design.id === designA);
  const designBObject = savedDesigns.find(design => design.id === designB);
  
  const handleCompare = () => {
    if (designA && designB) {
      setShowComparison(true);
    }
  };
  
  const canCompare = designA && designB && designA !== designB;
  
  return (
    <div className="w-full p-6">
      <h2 className="text-2xl font-semibold mb-6">Compare Designs</h2>
      
      {savedDesigns.length < 2 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Not Enough Designs</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You need at least two saved designs to use the comparison tool. Create more designs 
              from the Requirements tab, or load existing designs using the Load button in the header.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Select Designs to Compare</CardTitle>
              <CardDescription>
                Choose two designs from your saved designs to compare their specifications and metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4 items-center">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">First Design</label>
                  <Select value={designA || undefined} onValueChange={setDesignA}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select first design" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDesignsForA.map(design => (
                        <SelectItem key={`a-${design.id}`} value={design.id}>
                          {design.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-center">
                  <ArrowRight className="text-muted-foreground" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Second Design</label>
                  <Select value={designB || undefined} onValueChange={setDesignB}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select second design" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDesignsForB.map(design => (
                        <SelectItem key={`b-${design.id}`} value={design.id}>
                          {design.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center">
                <Button 
                  onClick={handleCompare}
                  disabled={!canCompare}
                  size="lg"
                >
                  Compare Designs
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {showComparison && designAObject && designBObject && (
            <DesignComparison designA={designAObject} designB={designBObject} />
          )}
        </>
      )}
    </div>
  );
};
