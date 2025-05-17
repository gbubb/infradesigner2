import React, { useState } from 'react';
import { useDesignStore } from '@/store/designStore';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Edit, Trash, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { ConnectionRule, AZScope, ConnectionPattern } from '@/types/infrastructure';
import { ConnectionRuleForm } from './connection-rules/ConnectionRuleForm';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

export const ConnectionRulesTab: React.FC = () => {
  const { activeDesign, updateDesign } = useDesignStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<ConnectionRule | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const connectionRules = activeDesign?.connectionRules || [];

  const handleAddRule = () => {
    setCurrentRule(null); // Reset to create new rule
    setIsDialogOpen(true);
  };

  const handleEditRule = (rule: ConnectionRule) => {
    setCurrentRule(rule);
    setIsDialogOpen(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRuleToDelete(ruleId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteRule = () => {
    if (!ruleToDelete || !activeDesign) return;
    
    const updatedRules = connectionRules.filter(rule => rule.id !== ruleToDelete);
    
    updateDesign(activeDesign.id, {
      connectionRules: updatedRules
    });
    
    toast.success('Connection rule deleted');
    setDeleteConfirmOpen(false);
    setRuleToDelete(null);
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    if (!activeDesign) return;

    const updatedRules = connectionRules.map(rule => 
      rule.id === ruleId ? { ...rule, enabled } : rule
    );
    
    updateDesign(activeDesign.id, {
      connectionRules: updatedRules
    });
    
    toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleMoveRule = (ruleId: string, direction: 'up' | 'down') => {
    if (!activeDesign) return;

    const ruleIndex = connectionRules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex === -1) return;
    
    const newIndex = direction === 'up' ? ruleIndex - 1 : ruleIndex + 1;
    if (newIndex < 0 || newIndex >= connectionRules.length) return;
    
    const updatedRules = [...connectionRules];
    const temp = updatedRules[ruleIndex];
    updatedRules[ruleIndex] = updatedRules[newIndex];
    updatedRules[newIndex] = temp;
    
    updateDesign(activeDesign.id, {
      connectionRules: updatedRules
    });
  };

  const handleSaveRule = (ruleData: ConnectionRule) => {
    if (!activeDesign) return;
    
    let updatedRules: ConnectionRule[];
    
    if (currentRule) {
      // Update existing rule
      updatedRules = connectionRules.map(rule => 
        rule.id === currentRule.id ? ruleData : rule
      );
      toast.success('Connection rule updated');
    } else {
      // Add new rule
      const newRule = {
        ...ruleData,
        id: uuidv4()
      };
      updatedRules = [...connectionRules, newRule];
      toast.success('Connection rule created');
    }
    
    updateDesign(activeDesign.id, {
      connectionRules: updatedRules
    });
    
    setIsDialogOpen(false);
  };

  const renderScopeBadge = (scope: AZScope) => {
    const scopeColors: Record<AZScope, string> = {
      [AZScope.SameAZ]: "bg-blue-100 text-blue-800",
      [AZScope.DifferentAZ]: "bg-purple-100 text-purple-800",
      [AZScope.AnyAZ]: "bg-gray-100 text-gray-800",
      [AZScope.SpecificAZ]: "bg-amber-100 text-amber-800",
    };
    
    return (
      <Badge className={scopeColors[scope]}>
        {scope}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Connection Rules</h2>
        <p className="text-sm text-muted-foreground">
          Define rules for automatically connecting devices based on type, role, and availability zone
        </p>
      </div>
      
      <div className="flex justify-between items-center">
        <Button onClick={handleAddRule} className="flex items-center gap-2">
          <Plus size={16} />
          <span>Add Rule</span>
        </Button>
      </div>
      
      {connectionRules.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border">
          <p className="text-gray-500">No connection rules defined yet</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={handleAddRule}
          >
            Create your first rule
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Pattern</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {connectionRules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.name}</TableCell>
                <TableCell>
                  {rule.sourceDeviceCriteria.componentType || '-'}
                  {rule.sourceDeviceCriteria.role && 
                    <span className="block text-xs text-gray-500">
                      Role: {rule.sourceDeviceCriteria.role}
                    </span>
                  }
                </TableCell>
                <TableCell>
                  {rule.targetDeviceCriteria.componentType || '-'}
                  {rule.targetDeviceCriteria.role && 
                    <span className="block text-xs text-gray-500">
                      Role: {rule.targetDeviceCriteria.role}
                    </span>
                  }
                </TableCell>
                <TableCell>
                  {renderScopeBadge(rule.azScope)}
                  {rule.azScope === AZScope.SpecificAZ && rule.targetAZId && (
                    <span className="block text-xs mt-1">
                      AZ: {rule.targetAZId}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {rule.connectionPattern === ConnectionPattern.ConnectToEachTarget ? (
                    <span>Each matching target</span>
                  ) : (
                    <span>
                      {rule.numberOfTargets || 0} targets
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Switch 
                    checked={rule.enabled} 
                    onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                  />
                </TableCell>
                <TableCell className="space-x-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleEditRule(rule)}
                  >
                    <Edit size={16} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash size={16} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleMoveRule(rule.id, 'up')}
                    disabled={connectionRules.indexOf(rule) === 0}
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleMoveRule(rule.id, 'down')}
                    disabled={connectionRules.indexOf(rule) === connectionRules.length - 1}
                  >
                    <ArrowDown size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentRule ? 'Edit Connection Rule' : 'New Connection Rule'}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[75vh] px-2">
            <ConnectionRuleForm
              initialValues={currentRule}
              onSave={handleSaveRule}
              onCancel={() => setIsDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Connection Rule</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this connection rule? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteRule}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
