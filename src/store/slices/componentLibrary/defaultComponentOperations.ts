
import { ComponentType, InfrastructureComponent } from '@/types/infrastructure';
import { StoreState } from '../../types';

export const handleDefaultComponents = (set: Function, get: () => StoreState) => ({
  getDefaultComponent: (type: ComponentType, role: string) => {
    const state = get();
    return state.componentTemplates.find(c => 
      c.type === type && 
      ((c as any).serverRole === role || (c as any).switchRole === role) && 
      c.isDefault
    );
  },
  
  setDefaultComponent: (type: ComponentType, role: string, id: string) => {
    set((state: StoreState) => {
      const updatedTemplates = state.componentTemplates.map(c => {
        if (c.type === type && ((c as any).serverRole === role || (c as any).switchRole === role)) {
          return { ...c, isDefault: c.id === id };
        }
        return c;
      });
      
      return { componentTemplates: updatedTemplates };
    });
    
    // Save to database
    get().saveAllComponentsToDB();
  }
});
