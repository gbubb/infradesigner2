
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus } from 'lucide-react';
import { LicensingRequirements, LicensingCost } from '@/types/infrastructure/licensing-types';
import { v4 as uuidv4 } from 'uuid';

interface LicensingRequirementsFormProps {
  requirements: LicensingRequirements;
  onUpdate: (requirements: LicensingRequirements) => void;
}

export const LicensingRequirementsForm: React.FC<LicensingRequirementsFormProps> = ({
  requirements,
  onUpdate
}) => {
  const [newCost, setNewCost] = useState<Partial<LicensingCost>>({
    name: '',
    amount: 0,
    frequency: 'monthly',
    description: ''
  });

  const handleSupportCostChange = (value: string) => {
    onUpdate({
      ...requirements,
      supportCostPerNode: parseFloat(value) || 0
    });
  };

  const handleSupportFrequencyChange = (frequency: 'monthly' | 'quarterly' | 'annually') => {
    onUpdate({
      ...requirements,
      supportCostFrequency: frequency
    });
  };

  const handleAddCost = () => {
    if (!newCost.name || !newCost.amount) return;

    const cost: LicensingCost = {
      id: uuidv4(),
      name: newCost.name,
      amount: newCost.amount,
      frequency: newCost.frequency as LicensingCost['frequency'],
      description: newCost.description
    };

    onUpdate({
      ...requirements,
      additionalCosts: [...requirements.additionalCosts, cost]
    });

    setNewCost({
      name: '',
      amount: 0,
      frequency: 'monthly',
      description: ''
    });
  };

  const handleRemoveCost = (id: string) => {
    onUpdate({
      ...requirements,
      additionalCosts: requirements.additionalCosts.filter(cost => cost.id !== id)
    });
  };

  const handleUpdateCost = (id: string, field: keyof LicensingCost, value: string | number) => {
    onUpdate({
      ...requirements,
      additionalCosts: requirements.additionalCosts.map(cost =>
        cost.id === id ? { ...cost, [field]: value } : cost
      )
    });
  };

  const frequencyOptions = [
    { value: 'one-time', label: 'One-time' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' }
  ];

  const supportFrequencyOptions = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Support Costs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="supportCostPerNode">Support Cost per Node ($)</Label>
              <Input
                id="supportCostPerNode"
                type="number"
                min="0"
                step="0.01"
                value={requirements.supportCostPerNode || 0}
                onChange={(e) => handleSupportCostChange(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="supportFrequency">Frequency</Label>
              <Select
                value={requirements.supportCostFrequency || 'monthly'}
                onValueChange={handleSupportFrequencyChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportFrequencyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Costs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="costName">Cost Name</Label>
              <Input
                id="costName"
                value={newCost.name || ''}
                onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                placeholder="e.g., VMware vSphere"
              />
            </div>
            <div>
              <Label htmlFor="costAmount">Amount ($)</Label>
              <Input
                id="costAmount"
                type="number"
                min="0"
                step="0.01"
                value={newCost.amount || 0}
                onChange={(e) => setNewCost({ ...newCost, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="costFrequency">Frequency</Label>
              <Select
                value={newCost.frequency || 'monthly'}
                onValueChange={(value) => setNewCost({ ...newCost, frequency: value as LicensingCost['frequency'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {frequencyOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAddCost}
                disabled={!newCost.name || !newCost.amount}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Cost
              </Button>
            </div>
          </div>

          {requirements.additionalCosts.length > 0 && (
            <div className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount ($)</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[50px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.additionalCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell>
                        <Input
                          value={cost.name}
                          onChange={(e) => handleUpdateCost(cost.id, 'name', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={cost.amount}
                          onChange={(e) => handleUpdateCost(cost.id, 'amount', parseFloat(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={cost.frequency}
                          onValueChange={(value) => handleUpdateCost(cost.id, 'frequency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {frequencyOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={cost.description || ''}
                          onChange={(e) => handleUpdateCost(cost.id, 'description', e.target.value)}
                          placeholder="Optional description"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveCost(cost.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
