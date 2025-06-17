import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RackProfile } from '@/types/infrastructure/rack-types';
import { Component } from '@/types/infrastructure/component-types';
import { PlacedDevice } from '@/types/infrastructure/rack-types';

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
    options: ExportOptions
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
      await this.addDetailedRackPages(pdf, groupedRacks, azNameMap);
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

    racks.forEach(rackData => {
      const azId = rackData.rack.availabilityZoneId || 'unknown';
      const azName = azNameMap[azId] || azId;
      
      if (!grouped[azName]) {
        grouped[azName] = [];
      }
      grouped[azName].push(rackData);
    });

    return grouped;
  }

  private static async addRowViewPages(
    pdf: jsPDF,
    groupedRacks: Record<string, RackWithDevices[]>,
    azNameMap: Record<string, string>
  ): Promise<void> {
    const racksPerRow = 6;
    const racksPerPage = 18; // 3 rows of 6 racks
    const thumbnailWidth = 30;
    const thumbnailHeight = 70;
    const spacing = 5;

    for (const [azName, racks] of Object.entries(groupedRacks)) {
      // Add AZ header
      pdf.setFontSize(16);
      pdf.text(`Availability Zone: ${azName}`, this.MARGIN, 20);

      let rackIndex = 0;
      while (rackIndex < racks.length) {
        if (rackIndex > 0) pdf.addPage();

        const pageRacks = racks.slice(rackIndex, rackIndex + racksPerPage);
        let row = 0;
        let col = 0;

        for (const rackData of pageRacks) {
          const x = this.MARGIN + (col * (thumbnailWidth + spacing));
          const y = 30 + (row * (thumbnailHeight + spacing + 10));

          // Draw rack thumbnail
          this.drawRackThumbnail(pdf, rackData, x, y, thumbnailWidth, thumbnailHeight);

          // Add rack name
          pdf.setFontSize(8);
          const displayName = this.getDisplayRackName(rackData.rack.name);
          pdf.text(displayName, x + thumbnailWidth / 2, y + thumbnailHeight + 3, { 
            align: 'center',
            maxWidth: thumbnailWidth
          });

          col++;
          if (col >= racksPerRow) {
            col = 0;
            row++;
          }
        }

        rackIndex += racksPerPage;
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
    const ruHeight = height / rackData.rack.uHeight;
    pdf.setDrawColor(230, 230, 230);
    pdf.setLineWidth(0.1);
    
    for (let ru = 1; ru < rackData.rack.uHeight; ru++) {
      const ruY = y + height - (ru * ruHeight);
      pdf.line(x, ruY, x + width, ruY);
    }

    // Draw devices
    rackData.devices.forEach(({ placedDevice, component }) => {
      const deviceHeight = (component.ruSize || 1) * ruHeight;
      const deviceY = y + height - (placedDevice.ruPosition * ruHeight);

      // Set color based on device type
      const color = this.getDeviceColorForPDF(component.type);
      pdf.setFillColor(color.r, color.g, color.b);
      pdf.setDrawColor(color.r * 0.8, color.g * 0.8, color.b * 0.8);
      
      // Draw device rectangle
      pdf.rect(x + 1, deviceY, width - 2, deviceHeight - 0.5, 'FD');

      // Add device label if space permits
      if (deviceHeight > 3) {
        pdf.setFontSize(6);
        pdf.setTextColor(255, 255, 255);
        const label = component.name.substring(0, 10);
        pdf.text(label, x + width / 2, deviceY + deviceHeight / 2, {
          align: 'center',
          baseline: 'middle'
        });
        pdf.setTextColor(0, 0, 0);
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
    azNameMap: Record<string, string>
  ): Promise<void> {
    for (const [azName, racks] of Object.entries(groupedRacks)) {
      for (const rackData of racks) {
        pdf.addPage();
        
        // Header
        pdf.setFontSize(16);
        pdf.text(`${rackData.rack.name} - ${azName}`, this.MARGIN, 20);
        
        // Rack info
        pdf.setFontSize(10);
        pdf.text(`Height: ${rackData.rack.uHeight}U`, this.MARGIN, 30);
        pdf.text(`Devices: ${rackData.devices.length}`, this.MARGIN + 50, 30);
        
        // Draw detailed rack
        this.drawDetailedRack(pdf, rackData, this.MARGIN, 40, 60, 200);
        
        // Device list
        this.drawDeviceList(pdf, rackData, 90, 40);
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
    const ruHeight = height / rackData.rack.uHeight;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    
    for (let ru = 1; ru <= rackData.rack.uHeight; ru++) {
      const ruY = y + height - (ru * ruHeight);
      pdf.line(x, ruY, x + width, ruY);
      
      // RU labels every 5 units
      if (ru % 5 === 0) {
        pdf.setFontSize(8);
        pdf.text(String(ru), x - 8, ruY + ruHeight / 2);
      }
    }

    // Draw devices with details
    rackData.devices.forEach(({ placedDevice, component }) => {
      const deviceHeight = (component.ruSize || 1) * ruHeight;
      const deviceY = y + height - (placedDevice.ruPosition * ruHeight);

      // Device rectangle
      const color = this.getDeviceColorForPDF(component.type);
      pdf.setFillColor(color.r, color.g, color.b);
      pdf.setDrawColor(color.r * 0.8, color.g * 0.8, color.b * 0.8);
      pdf.rect(x + 2, deviceY + 1, width - 4, deviceHeight - 2, 'FD');

      // Device label
      pdf.setFontSize(9);
      pdf.setTextColor(255, 255, 255);
      const label = `${component.name} (U${placedDevice.ruPosition}-U${placedDevice.ruPosition + (component.ruSize || 1) - 1})`;
      pdf.text(label, x + width / 2, deviceY + deviceHeight / 2, {
        align: 'center',
        baseline: 'middle',
        maxWidth: width - 8
      });
      pdf.setTextColor(0, 0, 0);
    });
  }

  private static drawDeviceList(
    pdf: jsPDF,
    rackData: RackWithDevices,
    x: number,
    y: number
  ): void {
    pdf.setFontSize(12);
    pdf.text('Device Details:', x, y);
    
    let currentY = y + 10;
    pdf.setFontSize(9);

    // Sort devices by RU position (top to bottom)
    const sortedDevices = [...rackData.devices].sort((a, b) => 
      b.placedDevice.ruPosition - a.placedDevice.ruPosition
    );

    sortedDevices.forEach(({ placedDevice, component }) => {
      // Check if we need a new page
      if (currentY > this.PAGE_HEIGHT - 30) {
        pdf.addPage();
        currentY = 20;
      }

      // Device info
      pdf.setFont(undefined, 'bold');
      pdf.text(`U${placedDevice.ruPosition}: ${component.name}`, x, currentY);
      
      pdf.setFont(undefined, 'normal');
      pdf.text(`Model: ${component.model || 'N/A'}`, x + 5, currentY + 5);
      pdf.text(`Manufacturer: ${component.manufacturer || 'N/A'}`, x + 5, currentY + 10);
      
      if (component.type === 'Server' && 'serverRole' in component && component.serverRole) {
        pdf.text(`Role: ${component.serverRole}`, x + 5, currentY + 15);
      }
      
      if (component.powerRequired) {
        pdf.text(`Power: ${component.powerRequired}W`, x + 5, currentY + 20);
      }

      currentY += 30;
    });
  }

  private static getDeviceColorForPDF(type: string): { r: number; g: number; b: number } {
    const colors: Record<string, { r: number; g: number; b: number }> = {
      'Server': { r: 59, g: 130, b: 246 }, // blue-500
      'Network': { r: 16, g: 185, b: 129 }, // emerald-500
      'Storage': { r: 236, g: 72, b: 153 }, // pink-500
      'Cabling': { r: 251, g: 191, b: 36 }, // amber-400
      'Accessories': { r: 168, g: 85, b: 247 }, // purple-500
    };

    return colors[type] || { r: 156, g: 163, b: 175 }; // gray-400
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