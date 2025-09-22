
import {
  AddDiskToStorageNodeFn,
  RemoveDiskFromStorageNodeFn,
  AddDiskToStorageClusterFn,
  RemoveDiskFromStorageClusterFn,
  AddDiskToStoragePoolFn,
  RemoveDiskFromStoragePoolFn,
  AddGPUToComputeNodeFn,
  RemoveGPUFromComputeNodeFn
} from '@/types/store-operations';

/**
 * Handles disk and GPU operations for components
 */
export const addDiskToStorageNode: AddDiskToStorageNodeFn = (
  roleId,
  diskId,
  quantity,
  selectedDisksByRole
) => {
  const currentDisks = selectedDisksByRole[roleId] || [];
  const existingDiskIndex = currentDisks.findIndex(d => d.diskId === diskId);
  
  let updatedDisks;
  if (existingDiskIndex >= 0) {
    updatedDisks = [...currentDisks];
    updatedDisks[existingDiskIndex] = { 
      ...updatedDisks[existingDiskIndex], 
      quantity 
    };
  } else {
    updatedDisks = [...currentDisks, { diskId, quantity }];
  }
  
  return {
    ...selectedDisksByRole,
    [roleId]: updatedDisks
  };
};

export const removeDiskFromStorageNode: RemoveDiskFromStorageNodeFn = (
  roleId,
  diskId,
  selectedDisksByRole
) => {
  const currentDisks = selectedDisksByRole[roleId] || [];
  const updatedDisks = currentDisks.filter(d => d.diskId !== diskId);

  return {
    ...selectedDisksByRole,
    [roleId]: updatedDisks
  };
};

export const addDiskToStorageCluster: AddDiskToStorageClusterFn = (
  storageClusterId,
  diskId,
  quantity,
  selectedDisksByStorageCluster
) => {
  const currentDisks = selectedDisksByStorageCluster[storageClusterId] || [];
  const existingDiskIndex = currentDisks.findIndex(d => d.diskId === diskId);

  let updatedDisks;
  if (existingDiskIndex >= 0) {
    updatedDisks = [...currentDisks];
    updatedDisks[existingDiskIndex] = {
      ...updatedDisks[existingDiskIndex],
      quantity
    };
  } else {
    updatedDisks = [...currentDisks, { diskId, quantity }];
  }

  return {
    ...selectedDisksByStorageCluster,
    [storageClusterId]: updatedDisks
  };
};

export const removeDiskFromStorageCluster: RemoveDiskFromStorageClusterFn = (
  storageClusterId,
  diskId,
  selectedDisksByStorageCluster
) => {
  const currentDisks = selectedDisksByStorageCluster[storageClusterId] || [];
  const updatedDisks = currentDisks.filter(d => d.diskId !== diskId);

  return {
    ...selectedDisksByStorageCluster,
    [storageClusterId]: updatedDisks
  };
};

export const addDiskToStoragePool: AddDiskToStoragePoolFn = (
  storagePoolId,
  diskId,
  quantity,
  selectedDisksByStoragePool
) => {
  const currentDisks = selectedDisksByStoragePool[storagePoolId] || [];
  const existingDiskIndex = currentDisks.findIndex(d => d.diskId === diskId);

  let updatedDisks;
  if (existingDiskIndex >= 0) {
    updatedDisks = [...currentDisks];
    updatedDisks[existingDiskIndex] = {
      ...updatedDisks[existingDiskIndex],
      quantity
    };
  } else {
    updatedDisks = [...currentDisks, { diskId, quantity }];
  }

  return {
    ...selectedDisksByStoragePool,
    [storagePoolId]: updatedDisks
  };
};

export const removeDiskFromStoragePool: RemoveDiskFromStoragePoolFn = (
  storagePoolId,
  diskId,
  selectedDisksByStoragePool
) => {
  const currentDisks = selectedDisksByStoragePool[storagePoolId] || [];
  const updatedDisks = currentDisks.filter(d => d.diskId !== diskId);

  return {
    ...selectedDisksByStoragePool,
    [storagePoolId]: updatedDisks
  };
};

export const addGPUToComputeNode: AddGPUToComputeNodeFn = (
  roleId,
  gpuId,
  quantity,
  selectedGPUsByRole
) => {
  const currentGPUs = selectedGPUsByRole[roleId] || [];
  const existingGPUIndex = currentGPUs.findIndex(g => g.gpuId === gpuId);
  
  let updatedGPUs;
  if (existingGPUIndex >= 0) {
    updatedGPUs = [...currentGPUs];
    updatedGPUs[existingGPUIndex] = { 
      ...updatedGPUs[existingGPUIndex], 
      quantity 
    };
  } else {
    updatedGPUs = [...currentGPUs, { gpuId, quantity }];
  }
  
  return {
    ...selectedGPUsByRole,
    [roleId]: updatedGPUs
  };
};

export const removeGPUFromComputeNode: RemoveGPUFromComputeNodeFn = (
  roleId,
  gpuId,
  selectedGPUsByRole
) => {
  const currentGPUs = selectedGPUsByRole[roleId] || [];
  const updatedGPUs = currentGPUs.filter(g => g.gpuId !== gpuId);
  
  return {
    ...selectedGPUsByRole,
    [roleId]: updatedGPUs
  };
};
