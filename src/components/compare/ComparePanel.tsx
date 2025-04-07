
import { useState, useMemo } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompareTabs } from './CompareTabs';
import { ArrowLeft, ArrowRight, BarChart } from 'lucide-react';
import { InfrastructureDesign } from '@/types/infrastructure';

export const ComparePanel = () => {
  const { savedDesigns } = useDesignStore();
  const [leftDesignId, setLeftDesignId] = useState<string | null>(null);
  const [rightDesignId, setRightDesignId] = useState<string | null>(null);

  // Find the selected designs from the store
  const leftDesign = useMemo(() => 
    savedDesigns.find(d => d.id === leftDesignId) || null, 
    [savedDesigns, leftDesignId]
  );
  
  const rightDesign = useMemo(() => 
    savedDesigns.find(d => d.id === rightDesignId) || null, 
    [savedDesigns, rightDesignId]
  );

  // Check if we have designs to compare
  const readyToCompare = leftDesign && rightDesign;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-center gap-4 mb-6">
        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Design A
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={leftDesignId || ""}
              onValueChange={(value) => setLeftDesignId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a design" />
              </SelectTrigger>
              <SelectContent>
                {savedDesigns.map((design) => (
                  <SelectItem key={design.id} value={design.id}>
                    {design.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center">
          <BarChart className="h-8 w-8 text-muted-foreground" />
        </div>

        <Card className="flex-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              Design B
              <ArrowRight className="ml-2 h-5 w-5" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={rightDesignId || ""}
              onValueChange={(value) => setRightDesignId(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a design" />
              </SelectTrigger>
              <SelectContent>
                {savedDesigns
                  .filter(design => design.id !== leftDesignId)
                  .map((design) => (
                    <SelectItem key={design.id} value={design.id}>
                      {design.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {readyToCompare ? (
        <CompareTabs leftDesign={leftDesign} rightDesign={rightDesign} />
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <BarChart className="h-16 w-16 mb-4" />
          <p className="text-xl font-medium">Select two designs to compare</p>
          <p className="text-sm mt-2">Choose designs from the dropdown menus above to start comparing</p>
        </div>
      )}
    </div>
  );
};
