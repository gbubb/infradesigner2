
// Since we can't directly modify this file, we need to extend the InfrastructureDesign interface to include our new properties
// This would typically be done by updating the infrastructure.ts file directly

// Add the necessary additions to src/store/types.ts
import { ComponentRole } from '@/types/infrastructure';

// Augment the InfrastructureDesign interface from the existing types
declare module '@/types/infrastructure' {
  interface InfrastructureDesign {
    // Add the additional properties we need to save/restore
    componentRoles?: ComponentRole[];
    selectedDisksByRole?: Record<string, { diskId: string, quantity: number }[]>;
    selectedGPUsByRole?: Record<string, { gpuId: string, quantity: number }[]>;
  }
}
