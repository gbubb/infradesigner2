export interface StorageDevice {
  id: string;
  type: 'HDD' | 'SSD_SATA' | 'NVMe';
  count: number;
  capacityTB: number;
  rpm?: number;
  generation?: 3 | 4 | 5;
}

export interface NetworkPort {
  id: string;
  count: number;
  speedGbps: 1 | 10 | 25 | 40 | 100;
}

export type PowerState = 'idle' | 'average' | 'peak';