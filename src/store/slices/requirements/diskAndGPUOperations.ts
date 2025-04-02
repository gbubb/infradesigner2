
/**
 * Handles disk and GPU operations for components
 */
export const addDiskToStorageNode = (
  roleId: string, 
  diskId: string, 
  quantity: number,
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>
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

export const removeDiskFromStorageNode = (
  roleId: string, 
  diskId: string,
  selectedDisksByRole: Record<string, { diskId: string, quantity: number }[]>
) => {
  const currentDisks = selectedDisksByRole[roleId] || [];
  const updatedDisks = currentDisks.filter(d => d.diskId !== diskId);
  
  return {
    ...selectedDisksByRole,
    [roleId]: updatedDisks
  };
};

export const addGPUToComputeNode = (
  roleId: string, 
  gpuId: string, 
  quantity: number,
  selectedGPUsByRole: Record<string, { gpuId: string, quantity: number }[]>
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

export const removeGPUFromComputeNode = (
  roleId: string, 
  gpuId: string,
  selectedGPUsByRole: Record<string, { gpuId: string, quantity: number }[]>
) => {
  const currentGPUs = selectedGPUsByRole[roleId] || [];
  const updatedGPUs = currentGPUs.filter(g => g.gpuId !== gpuId);
  
  return {
    ...selectedGPUsByRole,
    [roleId]: updatedGPUs
  };
};
