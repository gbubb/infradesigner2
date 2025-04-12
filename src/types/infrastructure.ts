
// This file is now a re-export of the modularized infrastructure types
// Import everything from the infrastructure module
import * as InfrastructureTypes from './infrastructure/index';

// Re-export all types from the infrastructure module
export * from './infrastructure/index';

// For backward compatibility, also export the namespace
export default InfrastructureTypes;
