import { ClusterParams } from './types';

export const calculateUtilization = (params: ClusterParams, monthsElapsed: number): number => {
  const { startUtilization, targetUtilization, growthModel } = params;
  
  switch (growthModel) {
    case 'compound': {
      // Simple compound growth (legacy)
      const monthlyRate = params.growthRate || 2;
      const weeklyMultiplier = Math.pow(1 + (monthlyRate / 100), 1/4.33) - 1;
      const weeksElapsed = monthsElapsed * 4.33;
      return Math.min(targetUtilization, startUtilization * Math.pow(1 + weeklyMultiplier, weeksElapsed));
    }
    
    case 'logistic': {
      // Logistic S-curve growth that starts at P0
      const K = targetUtilization || 85; // Carrying capacity
      const P0 = Math.max(0.1, startUtilization || 2); // Initial value (avoid zero)
      const r = params.growthRate || 0.5; // Growth rate
      const t0 = params.inflectionMonth || 12; // Inflection point
      
      // Modified logistic function that ensures f(0) = P0
      // We need to find the right offset to make this work
      const A = (K - P0) / P0;
      const offset = Math.log(A); // This ensures that at t=0, we get P0
      const result = K / (1 + A * Math.exp(-r * (monthsElapsed - t0 + offset/r)));
      return Math.min(K, Math.max(P0, isFinite(result) ? result : P0));
    }
    
    case 'phased': {
      // Three-phase growth model
      const phase1Duration = params.phase1Duration || 6;
      const phase2Duration = params.phase2Duration || 12;
      const phase1Rate = params.phase1Rate || 1.5;
      const phase2Rate = params.phase2Rate || 4;
      const phase3Rate = params.phase3Rate || 0.5;
      
      let utilization = startUtilization;
      
      if (monthsElapsed <= phase1Duration) {
        // Phase 1: Linear growth
        utilization = startUtilization + (phase1Rate * monthsElapsed);
      } else if (monthsElapsed <= phase1Duration + phase2Duration) {
        // Phase 2: Exponential growth
        const phase1End = startUtilization + (phase1Rate * phase1Duration);
        const phase2Months = monthsElapsed - phase1Duration;
        const monthlyMultiplier = 1 + (phase2Rate / 100);
        utilization = phase1End * Math.pow(monthlyMultiplier, phase2Months);
      } else {
        // Phase 3: Logarithmic growth (diminishing returns)
        const phase1End = startUtilization + (phase1Rate * phase1Duration);
        const phase2End = phase1End * Math.pow(1 + (phase2Rate / 100), phase2Duration);
        const phase3Months = monthsElapsed - phase1Duration - phase2Duration;
        // Logarithmic growth approaching target
        const remainingGap = targetUtilization - phase2End;
        utilization = phase2End + remainingGap * (1 - Math.exp(-phase3Rate * phase3Months));
      }
      
      return Math.min(targetUtilization, utilization);
    }
    
    default:
      return startUtilization;
  }
};