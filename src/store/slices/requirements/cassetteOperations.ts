
import { AddCassetteToPanelFn, RemoveCassetteFromPanelFn } from '@/types/store-operations';

/**
 * Handles cassette operations for patch panels
 */
export const addCassetteToPanel: AddCassetteToPanelFn = (
  roleId,
  cassetteId,
  quantity,
  selectedCassettesByRole
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

export const removeCassetteFromPanel: RemoveCassetteFromPanelFn = (
  roleId,
  cassetteId,
  selectedCassettesByRole
) => {
  const currentCassettes = selectedCassettesByRole[roleId] || [];
  const updatedCassettes = currentCassettes.filter(c => c.cassetteId !== cassetteId);

  return {
    ...selectedCassettesByRole,
    [roleId]: updatedCassettes
  };
};
