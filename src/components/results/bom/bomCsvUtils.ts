import { ComponentType, componentTypeToCategory, InfrastructureComponent } from '@/types/infrastructure';

// Accepts all BOM objects from the tab.
export function generateBomCsvContent({
  summarizedComponentsByCategory,
  diskLineItems,
  cableLineItems,
  transceiverLineItems
}: {
  summarizedComponentsByCategory: Record<string, (InfrastructureComponent & { summarizedQuantity: number })[]>,
  diskLineItems: any,
  cableLineItems: any,
  transceiverLineItems: any,
}) {
  let csvContent = "data:text/csv;charset=utf-8,Category,Type,Role/Model,Manufacturer,Model,Details,Quantity,Unit Cost,Total Cost\r\n";
  let dataToExport: any[] = [];

  // Helper to check for plain object (not array, not null, type object)
  const isPlainObject = (obj: any) =>
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj);

  // Safe: summarizedComponentsByCategory values should be arrays of objects.
  Object.values(summarizedComponentsByCategory).forEach(arr => dataToExport.push(...arr));
  // Safe: diskLineItems should be objects.
  dataToExport.push(
    ...Object.values(diskLineItems).filter(isPlainObject)
  );

  // Only spread over plain objects and add type as needed
  dataToExport.push(
    ...Object.values(cableLineItems)
      .filter(isPlainObject)
      .map(item => ({ ...item, type: "Cable" }))
  );
  dataToExport.push(
    ...Object.values(transceiverLineItems)
      .filter(isPlainObject)
      .map(item => ({ ...item, type: "Transceiver" }))
  );

  dataToExport.forEach(component => {
    const categoryName = component.type
      ? componentTypeToCategory[component.type as ComponentType] || component.type
      : "Other";
    const quantity = component.summarizedQuantity ?? component.quantity ?? component.count ?? 1;
    const totalCost = component.totalDiskCost ?? component.total ?? component.cost * quantity;
    let details = component.details ?? '-';
    if (component.type === ComponentType.Cable || component.type === "Cable") details = component.details;
    else if (component.type === "Transceiver") details = component.model;
    else if (component.type === ComponentType.FiberPatchPanel) details = `${component.ruSize}RU, ${component.cassetteCapacity} cassettes`;
    else if (component.type === ComponentType.CopperPatchPanel) details = `${component.ruSize}RU, ${component.portQuantity} ports`;
    else if (component.type === ComponentType.Cassette) details = `${component.portType}, ${component.portQuantity} ports`;
    csvContent += `${categoryName},${component.type},${component.role || component.transceiverModel || "-"},${component.manufacturer || "-"},${component.model || "-"},"${details}",${quantity},${component.costPer ?? component.cost},${totalCost}\r\n`;
  });
  return encodeURI(csvContent);
}
