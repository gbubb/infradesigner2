
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Minus, HardDrive } from 'lucide-react';
import { useDesignStore } from '@/store/designStore';
import { ComponentType } from '@/types/infrastructure';

interface CassetteConfigurationProps {
  roleId: string;
}

export const CassetteConfiguration: React.FC<CassetteConfigurationProps> = ({ roleId }) => {
  const { 
    componentTemplates,
    selectedCassettesByRole,
    addCassetteToPanel,
    removeCassetteFromPanel
  } = useDesignStore();

  const cassettes = componentTemplates.filter(c => c.type === ComponentType.Cassette);
  const selectedCassettes = selectedCassettesByRole[roleId] || [];

  const handleAddCassette = (cassetteId: string) => {
    if (!cassetteId) return;
    addCassetteToPanel(roleId, cassetteId, 1);
  };

  const handleRemoveCassette = (cassetteId: string) => {
    removeCassetteFromPanel(roleId, cassetteId);
  };

  return (
    <div className="space-y-4">
      <Label>Configure Cassettes</Label>
      <div className="space-y-2">
        {selectedCassettes.map(({ cassetteId, quantity }) => {
          const cassette = cassettes.find(c => c.id === cassetteId);
          if (!cassette) return null;
          
          return (
            <Card key={cassetteId} className="p-2">
              <CardContent className="p-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  <span className="text-sm">
                    {cassette.name} (x{quantity})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveCassette(cassetteId)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Select onValueChange={handleAddCassette}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Add cassette" />
          </SelectTrigger>
          <SelectContent>
            {cassettes.map(cassette => (
              <SelectItem key={cassette.id} value={cassette.id}>
                {cassette.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
