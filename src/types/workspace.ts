
import { InfrastructureComponent } from '@/types/infrastructure';

export interface ComponentWithPosition {
  id: string;
  position: { x: number; y: number };
  component: InfrastructureComponent;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}
