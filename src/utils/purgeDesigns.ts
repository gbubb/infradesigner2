
import { useDesignStore } from '@/store/designStore';

// Run this function once from the console to purge all designs from the database
export const purgeAllDesignsFromDB = async () => {
  console.log("Starting to purge all designs from database...");
  
  try {
    await useDesignStore.getState().purgeAllDesigns();
    console.log("Successfully purged all designs from database");
    window.location.reload(); // Reload the page to update the UI
  } catch (error) {
    console.error("Error purging designs:", error);
  }
};

// To make this function available in the console
if (typeof window !== 'undefined') {
  (window as any).purgeAllDesignsFromDB = purgeAllDesignsFromDB;
}
