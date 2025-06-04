import { useDesignStore } from '../designStore';
import { ChangeManager, ChangeType, ChangeImpact } from './changeManager';
import { DesignRequirements, InfrastructureComponent, ComponentRole } from '@/types/infrastructure';
import { calculateComponentRoles } from '../slices/requirements/roleCalculator';
import { v4 as uuidv4 } from 'uuid';

interface UpdateContext {
  previousRequirements: DesignRequirements;
  newRequirements: DesignRequirements;
  changes: ChangeType[];
  impact: ChangeImpact;
  preserveExistingComponents: boolean;
  preserveExistingRacks: boolean;
}

/**
 * Intelligent design updater that selectively updates only what's necessary
 * based on the specific requirements changes detected
 */
export class IntelligentDesignUpdater {
  
  /**
   * Main entry point for updating design based on requirements changes
   */
  static updateDesignFromRequirements(
    previousRequirements: DesignRequirements,
    newRequirements: DesignRequirements
  ): void {
    const state = useDesignStore.getState();
    
    // Detect what actually changed
    const changes = ChangeManager.detectChanges(previousRequirements, newRequirements);
    
    if (changes.length === 0) {
      console.log('IntelligentUpdater: No changes detected, skipping update');
      return;
    }
    
    // Determine impact of changes
    const impact = ChangeManager.getChangeImpact(changes);
    
    console.log('IntelligentUpdater: Detected changes:', changes);
    console.log('IntelligentUpdater: Impact analysis:', impact);
    
    const context: UpdateContext = {
      previousRequirements,
      newRequirements,
      changes,
      impact,
      preserveExistingComponents: impact.preserveComponentIds,
      preserveExistingRacks: impact.preserveRackIds
    };
    
    // Requirements are already updated by the caller, so we skip this step
    
    // Perform selective updates based on impact
    this.performSelectiveUpdate(context);
  }
  
  /**
   * Performs selective updates based on the change impact analysis
   */
  private static performSelectiveUpdate(context: UpdateContext): void {
    const state = useDesignStore.getState();
    
    // Step 1: Update component roles (if needed)
    this.updateComponentRoles(context);
    
    // Step 2: Update component instances (preserving IDs where possible)
    this.updateComponentInstances(context);
    
    // Step 3: Update rack configuration (preserving structure where possible)
    if (context.impact.requiresNewRacks || context.impact.requiresRackRebalancing) {
      this.updateRackConfiguration(context);
    } else {
      console.log('IntelligentUpdater: Preserving existing rack configuration');
    }
    
    // Step 4: Save the updated design
    if (state.activeDesign) {
      state.saveDesign();
    }
  }
  
  /**
   * Updates component roles based on new requirements
   */
  private static updateComponentRoles(context: UpdateContext): void {
    const state = useDesignStore.getState();
    
    if (context.impact.affectedRoles.length === 0) {
      console.log('IntelligentUpdater: No role updates needed');
      return;
    }
    
    console.log('IntelligentUpdater: Updating component roles for:', context.impact.affectedRoles);
    
    // Calculate new roles based on updated requirements
    const newRoles = calculateComponentRoles(
      context.newRequirements,
      state.componentTemplates
    );
    
    // Preserve existing assignments where possible
    const existingRoles = state.componentRoles || [];
    const preservedRoles = this.preserveRoleAssignments(existingRoles, newRoles, context);
    
    // Update the store with new roles
    state.setComponentRoles(preservedRoles);
  }
  
  /**
   * Preserves existing role assignments where the role still exists
   */
  private static preserveRoleAssignments(
    existingRoles: ComponentRole[],
    newRoles: ComponentRole[],
    context: UpdateContext
  ): ComponentRole[] {
    const shouldPreserveAll = context.impact.affectedRoles.includes('*') === false;
    
    return newRoles.map(newRole => {
      // Check if this role should be preserved
      const shouldPreserveRole = shouldPreserveAll || !context.impact.affectedRoles.includes(newRole.role);
      
      if (shouldPreserveRole) {
        // Find existing role with same role type and cluster info
        const existingRole = existingRoles.find(existing => 
          existing.role === newRole.role &&
          existing.clusterInfo?.clusterId === newRole.clusterInfo?.clusterId
        );
        
        if (existingRole && existingRole.assignedComponentId) {
          console.log(`IntelligentUpdater: Preserving assignment for role ${newRole.role}`);
          return {
            ...newRole,
            assignedComponentId: existingRole.assignedComponentId
          };
        }
      }
      
      return newRole;
    });
  }
  
  /**
   * Updates component instances while preserving IDs where possible
   */
  private static updateComponentInstances(context: UpdateContext): void {
    const state = useDesignStore.getState();
    
    if (!context.preserveExistingComponents) {
      console.log('IntelligentUpdater: Regenerating all component instances');
      this.regenerateAllComponents();
      return;
    }
    
    console.log('IntelligentUpdater: Updating component instances selectively');
    
    const existingComponents = state.activeDesign?.components || [];
    const componentRoles = state.componentRoles || [];
    
    // Calculate required components based on roles
    const updatedComponents = this.calculateComponentsFromRoles(
      componentRoles,
      existingComponents,
      context
    );
    
    // Update the design with new components
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        components: updatedComponents
      });
    }
  }
  
  /**
   * Calculates component instances from roles, preserving existing instances where possible
   */
  private static calculateComponentsFromRoles(
    roles: ComponentRole[],
    existingComponents: InfrastructureComponent[],
    context: UpdateContext
  ): InfrastructureComponent[] {
    const state = useDesignStore.getState();
    const updatedComponents: InfrastructureComponent[] = [];
    const componentInstanceCounts: { [key: string]: number } = {};
    
    // Create a map of existing components by role and template
    const existingByRole = new Map<string, InfrastructureComponent[]>();
    existingComponents.forEach(component => {
      const key = `${component.role}-${component.templateId}`;
      if (!existingByRole.has(key)) {
        existingByRole.set(key, []);
      }
      existingByRole.get(key)!.push(component);
    });
    
    roles.forEach(role => {
      if (!role.assignedComponentId || !role.adjustedRequiredCount || role.adjustedRequiredCount <= 0) {
        return;
      }
      
      const componentTemplate = state.componentTemplates.find(c => c.id === role.assignedComponentId);
      if (!componentTemplate) return;
      
      const requiredQuantity = role.adjustedRequiredCount;
      const roleKey = `${role.role}-${role.assignedComponentId}`;
      const existingForRole = existingByRole.get(roleKey) || [];
      
      // Preserve existing components up to the required quantity
      const preservedCount = Math.min(existingForRole.length, requiredQuantity);
      for (let i = 0; i < preservedCount; i++) {
        updatedComponents.push(existingForRole[i]);
      }
      
      // Create new components for any additional quantity needed
      const additionalNeeded = requiredQuantity - preservedCount;
      for (let i = 0; i < additionalNeeded; i++) {
        const templateIdForCount = componentTemplate.id;
        componentInstanceCounts[templateIdForCount] = (componentInstanceCounts[templateIdForCount] || preservedCount) + 1;
        const instanceName = `${componentTemplate.namingPrefix || componentTemplate.name}-${componentInstanceCounts[templateIdForCount]}`;
        
        const newComponent: InfrastructureComponent = {
          ...componentTemplate,
          id: uuidv4(),
          name: instanceName,
          templateId: componentTemplate.id,
          quantity: 1,
          role: role.role,
          ruSize: componentTemplate.ruSize,
        };
        
        updatedComponents.push(newComponent);
      }
      
      console.log(`IntelligentUpdater: Role ${role.role}: preserved ${preservedCount}, created ${additionalNeeded} new`);
    });
    
    return updatedComponents;
  }
  
  /**
   * Updates rack configuration based on changes
   */
  private static updateRackConfiguration(context: UpdateContext): void {
    const state = useDesignStore.getState();
    
    if (!state.activeDesign) return;
    
    if (context.impact.requiresNewRacks) {
      console.log('IntelligentUpdater: Regenerating rack structure due to structural changes');
      // Force rack regeneration by clearing existing racks
      state.updateDesign(state.activeDesign.id, {
        rackprofiles: undefined
      });
      // The rack system will automatically regenerate on next access
    } else if (context.impact.requiresRackRebalancing) {
      console.log('IntelligentUpdater: Rebalancing devices in existing racks');
      // TODO: Implement intelligent rebalancing that preserves rack structure
      // but adjusts device placements for new quantities
      this.rebalanceRackDevices(context);
    }
  }
  
  /**
   * Rebalances devices in existing racks without changing rack structure
   */
  private static rebalanceRackDevices(context: UpdateContext): void {
    // This is a placeholder for intelligent rack rebalancing
    // For now, we'll let the existing rack system handle it
    console.log('IntelligentUpdater: Rack rebalancing not yet implemented, using existing system');
  }
  
  /**
   * Fallback to regenerate all components (used when preservation isn't possible)
   */
  private static regenerateAllComponents(): void {
    const state = useDesignStore.getState();
    
    // Use the existing design calculator for full regeneration
    const updatedRoles = (state.componentRoles || []).map(role => {
      if (role.assignedComponentId) {
        const newQuantity = state.calculateRequiredQuantity(role.id, role.assignedComponentId);
        return {
          ...role,
          adjustedRequiredCount: newQuantity
        };
      }
      return role;
    });
    
    // Generate new component instances
    const updatedComponents = this.generateComponentInstances(updatedRoles);
    
    // Update the design
    if (state.activeDesign) {
      state.updateDesign(state.activeDesign.id, {
        components: updatedComponents
      });
    }
  }
  
  /**
   * Generates component instances from roles (similar to existing designCalculator logic)
   */
  private static generateComponentInstances(roles: ComponentRole[]): InfrastructureComponent[] {
    const state = useDesignStore.getState();
    const components: InfrastructureComponent[] = [];
    const templateInstanceCounts: { [key: string]: number } = {};
    
    roles.forEach(role => {
      if (!role.assignedComponentId || !role.adjustedRequiredCount || role.adjustedRequiredCount <= 0) {
        return;
      }
      
      const componentTemplate = state.componentTemplates.find(c => c.id === role.assignedComponentId);
      if (!componentTemplate) return;
      
      const requiredQuantity = role.adjustedRequiredCount;
      
      for (let i = 0; i < requiredQuantity; i++) {
        const templateIdForCount = componentTemplate.id;
        templateInstanceCounts[templateIdForCount] = (templateInstanceCounts[templateIdForCount] || 0) + 1;
        const instanceName = `${componentTemplate.namingPrefix || componentTemplate.name}-${templateInstanceCounts[templateIdForCount]}`;
        
        const newComponent: InfrastructureComponent = {
          ...componentTemplate,
          id: uuidv4(),
          name: instanceName,
          templateId: componentTemplate.id,
          quantity: 1,
          role: role.role,
          ruSize: componentTemplate.ruSize,
        };
        
        components.push(newComponent);
      }
    });
    
    return components;
  }
}