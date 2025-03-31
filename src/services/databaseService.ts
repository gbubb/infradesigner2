
import { InfrastructureComponent, InfrastructureDesign } from '@/types/infrastructure';

// Use localStorage as a simple persistent storage solution
// This can be replaced with a real database later
const DB_KEYS = {
  COMPONENTS: 'infra_components',
  DESIGNS: 'infra_designs',
};

/**
 * Database service for storing and retrieving components and designs
 */
export const databaseService = {
  // Component operations
  async getAllComponents(): Promise<InfrastructureComponent[]> {
    try {
      const componentsJson = localStorage.getItem(DB_KEYS.COMPONENTS);
      return componentsJson ? JSON.parse(componentsJson) : [];
    } catch (error) {
      console.error('Error retrieving components:', error);
      return [];
    }
  },

  async saveComponents(components: InfrastructureComponent[]): Promise<boolean> {
    try {
      localStorage.setItem(DB_KEYS.COMPONENTS, JSON.stringify(components));
      return true;
    } catch (error) {
      console.error('Error saving components:', error);
      return false;
    }
  },

  async updateComponent(component: InfrastructureComponent): Promise<boolean> {
    try {
      const components = await this.getAllComponents();
      const index = components.findIndex(c => c.id === component.id);
      
      if (index >= 0) {
        components[index] = component;
      } else {
        components.push(component);
      }
      
      return this.saveComponents(components);
    } catch (error) {
      console.error('Error updating component:', error);
      return false;
    }
  },

  async deleteComponent(id: string): Promise<boolean> {
    try {
      const components = await this.getAllComponents();
      const filteredComponents = components.filter(c => c.id !== id);
      return this.saveComponents(filteredComponents);
    } catch (error) {
      console.error('Error deleting component:', error);
      return false;
    }
  },

  // Design operations
  async getAllDesigns(): Promise<InfrastructureDesign[]> {
    try {
      const designsJson = localStorage.getItem(DB_KEYS.DESIGNS);
      return designsJson ? JSON.parse(designsJson) : [];
    } catch (error) {
      console.error('Error retrieving designs:', error);
      return [];
    }
  },

  async saveDesigns(designs: InfrastructureDesign[]): Promise<boolean> {
    try {
      localStorage.setItem(DB_KEYS.DESIGNS, JSON.stringify(designs));
      return true;
    } catch (error) {
      console.error('Error saving designs:', error);
      return false;
    }
  },

  async saveDesign(design: InfrastructureDesign): Promise<boolean> {
    try {
      const designs = await this.getAllDesigns();
      const index = designs.findIndex(d => d.id === design.id);
      
      if (index >= 0) {
        designs[index] = design;
      } else {
        designs.push(design);
      }
      
      return this.saveDesigns(designs);
    } catch (error) {
      console.error('Error saving design:', error);
      return false;
    }
  },

  async deleteDesign(id: string): Promise<boolean> {
    try {
      const designs = await this.getAllDesigns();
      const filteredDesigns = designs.filter(d => d.id !== id);
      return this.saveDesigns(filteredDesigns);
    } catch (error) {
      console.error('Error deleting design:', error);
      return false;
    }
  },

  // Data initialization
  async importData(components: InfrastructureComponent[], designs: InfrastructureDesign[]): Promise<boolean> {
    try {
      await this.saveComponents(components);
      await this.saveDesigns(designs);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
};
