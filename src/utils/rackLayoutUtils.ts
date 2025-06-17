import { RackService } from '@/services/rackService';
import { PlacementResult } from '@/services/rackService';
import { useDesignStore } from '@/store/designStore';

/**
 * Utility to initialize a rack layout with a sample configuration
 * @returns The ID of the created rack
 */
export const initializeExampleRack = (): string => {
  const state = useDesignStore.getState();
  const activeDesign = state.activeDesign;
  
  if (!activeDesign) {
    throw new Error("No active design found");
  }
  
  // Create a new rack
  const rackId = RackService.createRackProfile("Example Rack", 42);
  
  // Find all rackable components
  const rackableComponents = activeDesign.components.filter(comp => 
    comp.ruHeight && comp.ruHeight > 0
  );
  
  // Place some components for demonstration
  if (rackableComponents.length > 0) {
    for (let i = 0; i < Math.min(5, rackableComponents.length); i++) {
      const component = rackableComponents[i];
      const result = RackService.placeDevice(rackId, component.id);
      
      console.log(`Placed ${component.name}: ${result.success ? `at RU ${result.placedPosition}` : result.error}`);
    }
  } else {
    console.log("No rackable components found in the current design");
  }
  
  return rackId;
};

/**
 * Analyze a rack layout and return statistics about space usage
 * @param rackId The ID of the rack to analyze
 * @returns An object with rack statistics
 */
export const analyzeRackLayout = (rackId: string): {
  totalRU: number;
  usedRU: number;
  availableRU: number;
  utilizationPercentage: number;
  deviceCount: number;
} => {
  const rack = RackService.getRackProfile(rackId);
  if (!rack) throw new Error(`Rack with ID ${rackId} not found`);
  const state = useDesignStore.getState();
  const activeDesign = state.activeDesign;
  if (!activeDesign) throw new Error("No active design found");

  const usedRUs = new Set<number>();
  let deviceCount = 0;

  // Use the RU *size* of each device
  for (const device of rack.devices) {
    const component = activeDesign.components.find(c => c.id === device.deviceId);
    if (component) {
      const ruSize = component.ruSize || 1;
      for (let i = 0; i < ruSize; i++) {
        usedRUs.add(device.ruPosition + i);
      }
      deviceCount++;
    }
  }

  const usedRU = usedRUs.size;
  const totalRU = rack.uHeight;
  const availableRU = totalRU - usedRU;
  const utilizationPercentage = (usedRU / totalRU) * 100;

  return { totalRU, usedRU, availableRU, utilizationPercentage, deviceCount };
};

/**
 * Test function to demonstrate the rack placement API
 * @param rackId The ID of the rack to use for testing
 */
export const testRackPlacement = (rackId: string): void => {
  const state = useDesignStore.getState();
  const activeDesign = state.activeDesign;
  
  if (!activeDesign || !activeDesign.components) {
    console.error("No active design or components found");
    return;
  }
  
  // Find a component to place
  const rackableComponent = activeDesign.components.find(comp => comp.ruHeight && comp.ruHeight > 0);
  
  if (!rackableComponent) {
    console.error("No rackable components found");
    return;
  }
  
  console.log("=== Rack Placement Test ===");
  
  // Test 1: Place at a specific position
  console.log("Test 1: Placing at specific position (RU 10)");
  const result1 = RackService.placeDevice(rackId, rackableComponent.id, 10);
  console.log(result1);
  
  // If Test 1 succeeded, try placing at the same position again (should fail)
  if (result1.success) {
    console.log("Test 2: Trying to place another device at the same position (should fail)");
    const anotherComponent = activeDesign.components.find(comp => 
      comp.id !== rackableComponent.id && comp.ruHeight && comp.ruHeight > 0
    );
    
    if (anotherComponent) {
      const result2 = RackService.placeDevice(rackId, anotherComponent.id, 10);
      console.log(result2);
    } else {
      console.log("No other rackable component available for test");
    }
  }
  
  // Test 3: Auto-placement (no position specified)
  console.log("Test 3: Auto-placement (no position specified)");
  const yetAnotherComponent = activeDesign.components.find(comp => 
    comp.id !== rackableComponent.id && comp.ruHeight && comp.ruHeight > 0 && 
    !RackService.getRackProfile(rackId)?.devices.some(d => d.deviceId === comp.id)
  );
  
  if (yetAnotherComponent) {
    const result3 = RackService.placeDevice(rackId, yetAnotherComponent.id);
    console.log(result3);
  } else {
    console.log("No other rackable component available for test");
  }
  
  // Show rack analysis
  console.log("Rack Analysis:", analyzeRackLayout(rackId));
};
