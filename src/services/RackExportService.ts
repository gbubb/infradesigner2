import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RackProfile } from '@/types/infrastructure/rack-types';
import { Component, ComponentType } from '@/types/infrastructure/component-types';
import { PlacedDevice } from '@/types/infrastructure/rack-types';
import { formatPower } from '@/lib/formatters';

interface ExportOptions {
  includeRowView: boolean;
  includeDetailedView: boolean;
  selectedRacks?: string[];
  groupByAZ?: boolean;
}

interface RackWithDevices {
  rack: RackProfile;
  devices: Array<{
    placedDevice: PlacedDevice;
    component: Component;
  }>;
}

export class RackExportService {
  private static readonly PAGE_WIDTH = 210; // A4 width in mm
  private static readonly PAGE_HEIGHT = 297; // A4 height in mm
  private static readonly MARGIN = 10; // Page margin in mm
  private static readonly CONTENT_WIDTH = RackExportService.PAGE_WIDTH - (2 * RackExportService.MARGIN);
  private static readonly CONTENT_HEIGHT = RackExportService.PAGE_HEIGHT - (2 * RackExportService.MARGIN);

  static async exportRackLayoutsToPDF(
    racks: RackWithDevices[],
    azNameMap: Record<string, string>,
    options: ExportOptions,
    powerPerRack?: number
  ): Promise<void> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Add title page
    this.addTitlePage(pdf, racks.length, options);

    // Group racks by AZ if requested
    const groupedRacks = options.groupByAZ 
      ? this.groupRacksByAZ(racks, azNameMap)
      : { 'All Racks': racks };

    // Add row view (thumbnail grid)
    if (options.includeRowView) {
      await this.addRowViewPages(pdf, groupedRacks, azNameMap);
    }

    // Add detailed rack views
    if (options.includeDetailedView) {
      await this.addDetailedRackPages(pdf, groupedRacks, azNameMap, powerPerRack);
    }

    // Save the PDF
    const timestamp = new Date().toISOString().split('T')[0];
    pdf.save(`rack-layouts-${timestamp}.pdf`);
  }

  private static addTitlePage(pdf: jsPDF, totalRacks: number, options: ExportOptions): void {
    // Title
    pdf.setFontSize(24);
    pdf.text('Rack Layout Report', this.PAGE_WIDTH / 2, 40, { align: 'center' });

    // Date
    pdf.setFontSize(12);
    const date = new Date().toLocaleDateString();
    pdf.text(`Generated on: ${date}`, this.PAGE_WIDTH / 2, 55, { align: 'center' });

    // Summary
    pdf.setFontSize(14);
    pdf.text('Summary', this.MARGIN, 80);
    
    pdf.setFontSize(11);
    pdf.text(`• Total Racks: ${totalRacks}`, this.MARGIN + 5, 90);
    pdf.text(`• Contents:`, this.MARGIN + 5, 100);
    
    if (options.includeRowView) {
      pdf.text('  - Row-level thumbnail view', this.MARGIN + 10, 110);
    }
    if (options.includeDetailedView) {
      pdf.text('  - Detailed rack views with device information', this.MARGIN + 10, 120);
    }

    pdf.addPage();
  }

  private static groupRacksByAZ(
    racks: RackWithDevices[],
    azNameMap: Record<string, string>
  ): Record<string, RackWithDevices[]> {
    const grouped: Record<string, RackWithDevices[]> = {};
    const azOrder: string[] = [];

    // Maintain the original order while grouping
    racks.forEach(rackData => {
      const azId = rackData.rack.availabilityZoneId || 'unknown';
      const azName = azNameMap[azId] || azId;
      
      if (!grouped[azName]) {
        grouped[azName] = [];
        azOrder.push(azName);
      }
      grouped[azName].push(rackData);
    });

    // Return grouped racks in the order they were first encountered
    const orderedGrouped: Record<string, RackWithDevices[]> = {};
    azOrder.forEach(az => {
      orderedGrouped[az] = grouped[az];
    });

    return orderedGrouped;
  }

  private static async addRowViewPages(
    pdf: jsPDF,
    groupedRacks: Record<string, RackWithDevices[]>,
    azNameMap: Record<string, string>
  ): Promise<void> {
    // Landscape dimensions
    const pageWidth = 297; // A4 landscape width
    const pageHeight = 210; // A4 landscape height
    const margin = 15;
    const contentWidth = pageWidth - (2 * margin);
    const contentHeight = pageHeight - (2 * margin);

    // Calculate optimal thumbnail size to maximize use of space
    const racksPerRow = 8; // Optimal for visibility
    const maxRows = 2; // 2 rows per page for larger thumbnails
    const spacing = 4;
    const headerHeight = 25;
    const thumbnailWidth = (contentWidth - (spacing * (racksPerRow - 1))) / racksPerRow;
    const thumbnailHeight = (contentHeight - headerHeight - (spacing * (maxRows - 1))) / maxRows;

    for (const [azName, racks] of Object.entries(groupedRacks)) {
      pdf.addPage('a4', 'landscape');
      
      // Add AZ header
      pdf.setFontSize(14);
      pdf.text(`Availability Zone: ${azName}`, margin, 20);
      
      // Don't sort - maintain the order from the UI
      const sortedRacks = racks;

      let row = 0;
      let col = 0;
      const startY = 30;

      for (const rackData of sortedRacks) {
        if (row >= maxRows) {
          pdf.addPage('a4', 'landscape');
          row = 0;
          col = 0;
        }

        const x = margin + (col * (thumbnailWidth + spacing));
        const y = startY + (row * (thumbnailHeight + spacing + 8));

        // Draw rack thumbnail
        this.drawRackThumbnail(pdf, rackData, x, y, thumbnailWidth, thumbnailHeight);

        // Add rack name
        pdf.setFontSize(7);
        const displayName = this.getDisplayRackName(rackData.rack.name);
        pdf.text(displayName, x + thumbnailWidth / 2, y + thumbnailHeight + 2, { 
          align: 'center',
          maxWidth: thumbnailWidth
        });

        col++;
        if (col >= racksPerRow) {
          col = 0;
          row++;
        }
      }
    }
  }

  private static drawRackThumbnail(
    pdf: jsPDF,
    rackData: RackWithDevices,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Draw rack outline
    pdf.setDrawColor(200, 200, 200);
    pdf.setFillColor(245, 245, 245);
    pdf.rect(x, y, width, height, 'FD');

    // Draw RU markers
    const unitHeight = height / rackData.rack.uHeight;
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.1);
    
    for (let ru = 1; ru < rackData.rack.uHeight; ru++) {
      const ruY = y + height - (ru * unitHeight);
      pdf.line(x, ruY, x + width, ruY);
    }

    // Draw devices
    rackData.devices.forEach(({ placedDevice, component }) => {
      const deviceHeight = (component.ruSize || 1) * unitHeight;
      const deviceY = y + height - (placedDevice.ruPosition * unitHeight);

      // Set color based on device type
      const color = this.getDeviceColorForPDF(component.type, component);
      pdf.setFillColor(color.r, color.g, color.b);
      pdf.setDrawColor(color.r * 0.8, color.g * 0.8, color.b * 0.8);
      
      // Draw device rectangle
      pdf.rect(x + 1, deviceY, width - 2, deviceHeight - 0.5, 'FD');

      // Add device label if space permits
      if (deviceHeight > 3) {
        pdf.setFontSize(6);
        pdf.setTextColor(0, 0, 0); // Black text for better contrast
        const label = component.name.substring(0, 10);
        pdf.text(label, x + width / 2, deviceY + deviceHeight / 2, {
          align: 'center',
          baseline: 'middle'
        });
      }
    });

    // Add RU labels
    pdf.setFontSize(6);
    pdf.text(String(rackData.rack.uHeight), x + width + 1, y + 3);
    pdf.text('1', x + width + 1, y + height - 1);
  }

  private static async addDetailedRackPages(
    pdf: jsPDF,
    groupedRacks: Record<string, RackWithDevices[]>,
    azNameMap: Record<string, string>,
    powerPerRack?: number
  ): Promise<void> {
    for (const [azName, racks] of Object.entries(groupedRacks)) {
      for (const rackData of racks) {
        pdf.addPage('a4', 'portrait'); // Ensure portrait orientation
        
        // Header
        pdf.setFontSize(16);
        pdf.text(`${rackData.rack.name} - ${azName}`, this.MARGIN, 20);
        
        // Rack info
        pdf.setFontSize(10);
        pdf.text(`Height: ${rackData.rack.uHeight}U`, this.MARGIN, 30);
        pdf.text(`Devices: ${rackData.devices.length}`, this.MARGIN + 50, 30);
        
        // Draw detailed rack
        this.drawDetailedRack(pdf, rackData, this.MARGIN, 40, 60, 200);
        
        // Device list with power breakdown
        this.drawDeviceList(pdf, rackData, 90, 40, powerPerRack);
      }
    }
  }

  private static drawDetailedRack(
    pdf: jsPDF,
    rackData: RackWithDevices,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // Draw rack frame
    pdf.setDrawColor(100, 100, 100);
    pdf.setFillColor(250, 250, 250);
    pdf.rect(x, y, width, height, 'FD');

    // Draw RU grid
    const unitHeight = height / rackData.rack.uHeight;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    
    for (let ru = 1; ru <= rackData.rack.uHeight; ru++) {
      const ruY = y + height - (ru * unitHeight);
      pdf.line(x, ruY, x + width, ruY);
      
      // RU labels every 5 units
      if (ru % 5 === 0) {
        pdf.setFontSize(8);
        pdf.text(String(ru), x - 8, ruY + unitHeight / 2);
      }
    }

    // Draw devices with details
    rackData.devices.forEach(({ placedDevice, component }) => {
      const deviceHeight = (component.ruSize || 1) * unitHeight;
      const deviceY = y + height - (placedDevice.ruPosition * unitHeight);

      // Device rectangle
      const color = this.getDeviceColorForPDF(component.type, component);
      pdf.setFillColor(color.r, color.g, color.b);
      pdf.setDrawColor(color.r * 0.8, color.g * 0.8, color.b * 0.8);
      pdf.rect(x + 2, deviceY + 1, width - 4, deviceHeight - 2, 'FD');

      // Device label
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0); // Black text for better contrast
      const ruSize = component.ruSize || 1;
      const positionLabel = ruSize === 1 
        ? `U${placedDevice.ruPosition}`
        : `U${placedDevice.ruPosition}-U${placedDevice.ruPosition + ruSize - 1}`;
      const label = `${component.name} (${positionLabel})`;
      pdf.text(label, x + width / 2, deviceY + deviceHeight / 2, {
        align: 'center',
        baseline: 'middle',
        maxWidth: width - 8
      });
    });
  }

  private static drawDeviceList(
    pdf: jsPDF,
    rackData: RackWithDevices,
    x: number,
    y: number,
    powerPerRack?: number
  ): void {
    pdf.setFontSize(12);
    pdf.text('Device Summary:', x, y);
    
    let currentY = y + 10;
    pdf.setFontSize(9);

    // Group devices by component type and specification
    const deviceGroups = new Map<string, {
      component: Component;
      positions: number[];
    }>();

    rackData.devices.forEach(({ placedDevice, component }) => {
      // Create a unique key for each component specification
      const key = `${component.type}-${component.manufacturer}-${component.model}`;
      
      if (!deviceGroups.has(key)) {
        deviceGroups.set(key, {
          component,
          positions: []
        });
      }
      
      deviceGroups.get(key)!.positions.push(placedDevice.ruPosition);
    });

    // Sort groups by highest RU position
    const sortedGroups = Array.from(deviceGroups.entries()).sort((a, b) => {
      const maxA = Math.max(...a[1].positions);
      const maxB = Math.max(...b[1].positions);
      return maxB - maxA;
    });

    sortedGroups.forEach(([key, group]) => {
      // Check if we need a new page
      if (currentY > this.PAGE_HEIGHT - 40) {
        pdf.addPage();
        currentY = 20;
      }

      const { component, positions } = group;
      
      // Sort positions in descending order
      positions.sort((a, b) => b - a);
      
      // Component header
      pdf.setFont(undefined, 'bold');
      pdf.text(`${component.name} (${positions.length}x)`, x, currentY);
      
      // Component details
      pdf.setFont(undefined, 'normal');
      pdf.text(`Type: ${component.type}`, x + 5, currentY + 5);
      pdf.text(`Model: ${component.model || 'N/A'}`, x + 5, currentY + 10);
      pdf.text(`Manufacturer: ${component.manufacturer || 'N/A'}`, x + 5, currentY + 15);
      
      if (component.type === 'Server' && 'serverRole' in component && component.serverRole) {
        pdf.text(`Role: ${component.serverRole}`, x + 5, currentY + 20);
        currentY += 5;
      }
      
      if (component.powerRequired) {
        pdf.text(`Power: ${component.powerRequired}W each`, x + 5, currentY + 20);
        currentY += 5;
      }
      
      // RU positions
      const ruSize = component.ruSize || 1;
      const positionStrings = positions.map(pos => {
        if (ruSize === 1) {
          return `U${pos}`;
        } else {
          return `U${pos}-U${pos + ruSize - 1}`;
        }
      });
      
      pdf.text(`Positions: ${positionStrings.join(', ')}`, x + 5, currentY + 20);
      
      currentY += 35;
    });
    
    // Add Power Breakdown section if powerPerRack is provided
    if (powerPerRack && powerPerRack > 0) {
      // Check if we need a new page for power breakdown
      if (currentY > this.PAGE_HEIGHT - 80) {
        pdf.addPage();
        currentY = 20;
      }
      
      // Power Breakdown Header
      pdf.setFontSize(12);
      pdf.text('Power Breakdown:', x, currentY);
      currentY += 10;
      
      // Calculate power statistics
      let totalIdlePower = 0;
      let totalTypicalPower = 0;
      let totalPeakPower = 0;
      const powerByType: Partial<Record<ComponentType, { idle: number; typical: number; peak: number; count: number }>> = {};
      
      rackData.devices.forEach(({ component }) => {
        const quantity = 1; // Each device in rack is counted individually
        
        // Check if component has enhanced power data
        const hasEnhancedPower = 
          component.powerIdle !== undefined && 
          component.powerTypical !== undefined && 
          component.powerPeak !== undefined &&
          (component.powerIdle > 0 || component.powerTypical > 0 || component.powerPeak > 0);
        
        let idlePower = 0;
        let typicalPower = 0;
        let peakPower = 0;
        
        if (hasEnhancedPower) {
          idlePower = component.powerIdle || 0;
          typicalPower = component.powerTypical || 0;
          peakPower = component.powerPeak || 0;
        } else if (component.powerRequired) {
          // Fallback to powerRequired
          peakPower = component.powerRequired;
          idlePower = peakPower / 3;
          typicalPower = peakPower * 0.6;
        }
        
        totalIdlePower += idlePower * quantity;
        totalTypicalPower += typicalPower * quantity;
        totalPeakPower += peakPower * quantity;
        
        // Aggregate by type
        const componentType = component.type as ComponentType;
        if (!powerByType[componentType]) {
          powerByType[componentType] = { idle: 0, typical: 0, peak: 0, count: 0 };
        }
        powerByType[componentType].idle += idlePower * quantity;
        powerByType[componentType].typical += typicalPower * quantity;
        powerByType[componentType].peak += peakPower * quantity;
        powerByType[componentType].count += quantity;
      });
      
      
      // Power capacity and utilization
      pdf.setFontSize(9);
      const peakUtilization = (totalPeakPower / powerPerRack) * 100;
      
      pdf.setFont(undefined, 'bold');
      pdf.text(`Power Capacity: ${formatPower(powerPerRack)}`, x + 5, currentY);
      pdf.setFont(undefined, 'normal');
      currentY += 5;
      
      // Power states
      pdf.text(`Idle Power: ${formatPower(totalIdlePower)}`, x + 5, currentY);
      currentY += 5;
      pdf.text(`Typical Power: ${formatPower(totalTypicalPower)}`, x + 5, currentY);
      currentY += 5;
      pdf.text(`Peak Power: ${formatPower(totalPeakPower)} (${peakUtilization.toFixed(1)}% utilization)`, x + 5, currentY);
      currentY += 10;
      
      // Power by component type
      if (Object.keys(powerByType).length > 0) {
        pdf.text('Power by Component Type (Peak):', x + 5, currentY);
        currentY += 5;
        
        Object.entries(powerByType).forEach(([type, data]) => {
          if (data.peak > 0) {
            const percentage = (data.peak / totalPeakPower) * 100;
            pdf.text(`• ${type}: ${formatPower(data.peak)} (${percentage.toFixed(1)}%)`, x + 10, currentY);
            currentY += 5;
          }
        });
      }
      
      // Add warning if over capacity
      if (peakUtilization > 100) {
        currentY += 5;
        pdf.setTextColor(255, 0, 0);
        pdf.setFont(undefined, 'bold');
        pdf.text('⚠ Warning: Peak power exceeds rack capacity!', x + 5, currentY);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
      } else if (peakUtilization > 80) {
        currentY += 5;
        pdf.setTextColor(255, 140, 0);
        pdf.setFont(undefined, 'bold');
        pdf.text('⚠ Warning: Peak power above 80% of capacity', x + 5, currentY);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
      }
    }
  }

  private static getDeviceColorForPDF(type: string, component?: Component): { r: number; g: number; b: number } {
    // Enhanced saturated colors for better PDF visibility
    // For servers, differentiate by role
    if (type === ComponentType.Server && component && 'serverRole' in component && component.serverRole) {
      switch (component.serverRole) {
        case 'compute':
          return { r: 96, g: 165, b: 250 }; // blue-400
        case 'controller':
          return { r: 45, g: 212, b: 191 }; // teal-400
        case 'infrastructure':
          return { r: 129, g: 140, b: 248 }; // indigo-400
        case 'storage':
          return { r: 251, g: 146, b: 60 }; // orange-400
        case 'gpu':
          return { r: 192, g: 132, b: 252 }; // purple-400
        default:
          return { r: 96, g: 165, b: 250 }; // blue-400
      }
    }
    
    // Type-based colors with higher saturation
    switch (type) {
      case ComponentType.Server:
        return { r: 96, g: 165, b: 250 }; // blue-400
      case ComponentType.Switch:
        return { r: 74, g: 222, b: 128 }; // green-400
      case ComponentType.Router:
        return { r: 250, g: 204, b: 21 }; // yellow-400
      case ComponentType.Firewall:
        return { r: 248, g: 113, b: 113 }; // red-400
      case ComponentType.FiberPatchPanel:
      case ComponentType.CopperPatchPanel:
        return { r: 34, g: 211, b: 238 }; // cyan-400
      case ComponentType.Cassette:
        return { r: 34, g: 211, b: 238 }; // cyan-400
      case ComponentType.PDU:
        return { r: 74, g: 222, b: 128 }; // green-400
      case ComponentType.Transceiver:
        return { r: 192, g: 132, b: 252 }; // purple-400
      default:
        return { r: 156, g: 163, b: 175 }; // gray-400
    }
  }

  private static getDisplayRackName(fullName: string): string {
    if (fullName.includes('-Rack')) {
      return fullName.split('-Rack')[1] ? `Rack ${fullName.split('-Rack')[1]}` : fullName;
    } else if (fullName.includes('Rack')) {
      const parts = fullName.split('Rack');
      if (parts.length > 1 && parts[1]) return `Rack ${parts[1]}`;
    }
    return fullName;
  }

  private static extractRackNumber(rackName: string): number {
    // Extract numeric part from rack name for sorting
    const match = rackName.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // Helper method to capture element as image
  static async captureElementAsImage(element: HTMLElement): Promise<string> {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true
    });

    return canvas.toDataURL('image/png');
  }
}