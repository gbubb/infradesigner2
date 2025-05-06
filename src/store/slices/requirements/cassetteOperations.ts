
/**
 * Handles cassette operations for patch panels
 */
export const addCassetteToPanel = (
  roleId: string, 
  cassetteId: string, 
  quantity: number,
  selectedCassettesByRole: Record<string, { cassetteId: string, quantity: number }[]>
) => {
  const currentCassettes = selectedCassettesByRole[roleId] || [];
  const existingIndex = currentCassettes.findIndex(c => c.cassetteId === cassetteId);

  let updatedCassettes;
  if (existingIndex >= 0) {
    updatedCassettes = [...currentCassettes];
    updatedCassettes[existingIndex] = {
      ...updatedCassettes[existingIndex],
      quantity: updatedCassettes[existingIndex].quantity + quantity
    };
  } else {
    updatedCassettes = [...currentCassettes, { cassetteId, quantity }];
  }

  return {
    ...selectedCassettesByRole,
    [roleId]: updatedCassettes
  };
};

export const removeCassetteFromPanel = (
  roleId: string, 
  cassetteId: string,
  selectedCassettesByRole: Record<string, { cassetteId: string, quantity: number }[]>
) => {
  const currentCassettes = selectedCassettesByRole[roleId] || [];
  const updatedCassettes = currentCassettes.filter(c => c.cassetteId !== cassetteId);

  return {
    ...selectedCassettesByRole,
    [roleId]: updatedCassettes
  };
};
