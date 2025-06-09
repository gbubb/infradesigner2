// Re-export types and constants from new locations
export type { PowerCalibrationProfile } from '../power-calibration/PowerCalibrationTypes';
export { DEFAULT_CALIBRATION_PROFILE } from '../power-calibration/PowerCalibrationConstants';
export {
  saveCalibrationProfile,
  getCalibrationProfiles,
  deleteCalibrationProfile,
  getActiveCalibrationProfile,
  setActiveCalibrationProfile
} from '@/hooks/power-calibration/useCalibrationProfiles';