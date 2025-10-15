import { DesignRequirements } from '@/types/infrastructure';

/**
 * Migration utility to handle legacy designs with swapped storage nomenclature.
 *
 * Legacy structure (before refactoring):
 * - storagePools: physical infrastructure (incorrectly named)
 * - storageClusters: logical capacity tiers (incorrectly named)
 *
 * New structure (after refactoring):
 * - storageClusters: physical infrastructure (correctly named)
 * - storagePools: logical capacity tiers (correctly named)
 *
 * This function detects and migrates legacy designs automatically.
 */
export function migrateStorageRequirements(requirements: DesignRequirements): DesignRequirements {
  // Skip if requirements don't exist
  if (!requirements?.storageRequirements) {
    return requirements;
  }

  const { storageRequirements } = requirements;

  // Detection: Legacy designs have storagePools with 'type' field (physical)
  // and storageClusters with 'poolType' field (logical)
  const hasLegacyStructure =
    Array.isArray(storageRequirements.storagePools) &&
    storageRequirements.storagePools.length > 0 &&
    storageRequirements.storagePools.some((item: any) =>
      'type' in item && ('hyperConverged' in item || 'computeClusterId' in item)
    );

  // If not legacy, return as-is
  if (!hasLegacyStructure) {
    return requirements;
  }

  console.log('[Migration] Detected legacy storage structure, migrating...');

  // Swap the arrays and transform field names
  const legacyPools = storageRequirements.storagePools || [];
  const legacyClusters = storageRequirements.storageClusters || [];

  // Legacy pools (physical) → New clusters (physical)
  const newClusters = legacyPools.map((legacyPool: any) => ({
    id: legacyPool.id,
    name: legacyPool.name,
    type: legacyPool.type || 'dedicated',
    computeClusterId: legacyPool.computeClusterId,
    availabilityZoneQuantity: legacyPool.availabilityZoneQuantity || 3,
    cpuCoresPerDisk: legacyPool.cpuCoresPerDisk,
    memoryGBPerDisk: legacyPool.memoryGBPerDisk,
  }));

  // Legacy clusters (logical) → New pools (logical)
  const newPools = legacyClusters.map((legacyCluster: any) => ({
    id: legacyCluster.id,
    name: legacyCluster.name,
    totalCapacityTB: legacyCluster.totalCapacityTB || 0,
    poolType: legacyCluster.poolType || '3 Replica',
    maxFillFactor: legacyCluster.maxFillFactor || 85,
    storageClusterId: legacyCluster.storagePoolId, // Map storagePoolId → storageClusterId
    // Preserve legacy fields for compatibility
    availabilityZoneQuantity: legacyCluster.availabilityZoneQuantity,
    hyperConverged: legacyCluster.hyperConverged,
    computeClusterId: legacyCluster.computeClusterId,
  }));

  console.log('[Migration] Migrated:', {
    clustersCount: newClusters.length,
    poolsCount: newPools.length
  });

  return {
    ...requirements,
    storageRequirements: {
      ...storageRequirements,
      storageClusters: newClusters,
      storagePools: newPools,
    }
  };
}
