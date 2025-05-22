import { generateConnections } from '@/services/connectionService';
import type { InfrastructureDesign, ConnectionRule, Cable } from '@/types/infrastructure';
import type { ConnectionAttempt } from '@/types/infrastructure/connection-service-types';

self.onmessage = (event: MessageEvent<{ 
  design: InfrastructureDesign, 
  rules: ConnectionRule[], 
  allCableTemplates: Cable[]
}>) => {
  try {
    const { design, rules, allCableTemplates } = event.data;
    // Ensure components and rules are not undefined, providing empty arrays as defaults if necessary.
    const safeDesign = {
      ...design,
      components: design.components || [],
      connectionRules: design.connectionRules || [],
      rackprofiles: design.rackprofiles || [],
    };
    const safeRules = rules || [];
    const safeAllCableTemplates = allCableTemplates || [];

    console.log('[ConnectionWorker] Received allCableTemplates count:', safeAllCableTemplates.length);
    console.log('[ConnectionWorker] Sample of received cable templates:', 
      safeAllCableTemplates.slice(0, 5).map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.type, 
        connectorA: (c as any).connectorA_Type,
        connectorB: (c as any).connectorB_Type
      }))
    );

    const attempts: ConnectionAttempt[] = generateConnections(safeDesign, safeRules, safeAllCableTemplates);
    self.postMessage({ status: 'success', attempts });
  } catch (error) {
    console.error('[ConnectionWorker] Error during connection generation:', error);
    self.postMessage({ status: 'error', error: error instanceof Error ? error.message : 'Unknown worker error' });
  }
}; 