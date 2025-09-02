import { generateConnections } from '@/services/connectionService';
import type { InfrastructureDesign, ConnectionRule, Cable, Transceiver } from '@/types/infrastructure';
import type { ConnectionAttempt } from '@/types/infrastructure/connection-service-types';
import type { CableDistanceSettings } from '@/types/infrastructure/cable-settings-types';

self.onmessage = (event: MessageEvent<{ 
  design: InfrastructureDesign, 
  rules: ConnectionRule[], 
  allCableTemplates: Cable[],
  allTransceiverTemplates: Transceiver[],
  cableDistanceSettings?: CableDistanceSettings
}>) => {
  try {
    const { design, rules, allCableTemplates, allTransceiverTemplates, cableDistanceSettings } = event.data;
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

    // console.log('[ConnectionWorker] Processing connection generation with', safeAllCableTemplates.length, 'cables,', safeAllTransceiverTemplates.length, 'transceivers,', safeRules.length, 'rules');

    const attempts: ConnectionAttempt[] = generateConnections(safeDesign, safeRules, safeAllCableTemplates, safeAllTransceiverTemplates, cableDistanceSettings);
    self.postMessage({ status: 'success', attempts });
  } catch (error) {
    console.error('[ConnectionWorker] Error during connection generation:', error);
    self.postMessage({ status: 'error', error: error instanceof Error ? error.message : 'Unknown worker error' });
  }
}; 