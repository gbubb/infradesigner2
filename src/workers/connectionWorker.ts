import { generateConnections } from '@/services/connectionService';
import type { InfrastructureDesign, ConnectionRule } from '@/types/infrastructure';
import type { ConnectionAttempt } from '@/types/infrastructure/connection-service-types';

self.onmessage = (event: MessageEvent<{ design: InfrastructureDesign, rules: ConnectionRule[] }>) => {
  try {
    const { design, rules } = event.data;
    // Ensure components and rules are not undefined, providing empty arrays as defaults if necessary.
    const safeDesign = {
      ...design,
      components: design.components || [],
      connectionRules: design.connectionRules || [],
      rackprofiles: design.rackprofiles || [],
    };
    const safeRules = rules || [];

    const attempts: ConnectionAttempt[] = generateConnections(safeDesign, safeRules);
    self.postMessage({ status: 'success', attempts });
  } catch (error) {
    self.postMessage({ status: 'error', error: error instanceof Error ? error.message : 'Unknown worker error' });
  }
}; 