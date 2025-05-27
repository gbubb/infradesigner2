import { generateConnections } from '@/services/connectionService';
import type { InfrastructureDesign, ConnectionRule, Cable, Transceiver } from '@/types/infrastructure';
import type { ConnectionAttempt } from '@/types/infrastructure/connection-service-types';

self.onmessage = (event: MessageEvent<{ 
  design: InfrastructureDesign, 
  rules: ConnectionRule[], 
  allCableTemplates: Cable[],
  allTransceiverTemplates: Transceiver[]
}>) => {
  try {
    const { design, rules, allCableTemplates, allTransceiverTemplates } = event.data;
    // Ensure components and rules are not undefined, providing empty arrays as defaults if necessary.
    const safeDesign = {
      ...design,
      components: design.components || [],
      connectionRules: design.connectionRules || [],
      rackprofiles: design.rackprofiles || [],
    };
    const safeRules = rules || [];
    const safeAllCableTemplates = allCableTemplates || [];
    const safeAllTransceiverTemplates = allTransceiverTemplates || [];

    console.log('[ConnectionWorker] Received allCableTemplates count:', safeAllCableTemplates.length);
    console.log('[ConnectionWorker] Received allTransceiverTemplates count:', safeAllTransceiverTemplates.length);
    console.log('[ConnectionWorker] Sample of received cable templates:', 
      safeAllCableTemplates.slice(0, 5).map(c => ({ 
        id: c.id, 
        name: c.name, 
        type: c.type, 
        connectorA: (c as any).connectorA_Type,
        connectorB: (c as any).connectorB_Type
      }))
    );

    const attempts: ConnectionAttempt[] = generateConnections(safeDesign, safeRules, safeAllCableTemplates, safeAllTransceiverTemplates);
    self.postMessage({ status: 'success', attempts });
  } catch (error) {
    console.error('[ConnectionWorker] Error during connection generation:', error);
    self.postMessage({ status: 'error', error: error instanceof Error ? error.message : 'Unknown worker error' });
  }
}; 