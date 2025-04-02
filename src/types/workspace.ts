
import { InfrastructureComponent } from '@/types/infrastructure';

export interface Position {
  x: number;
  y: number;
}

export interface ComponentWithPosition {
  id: string;
  position: Position;
  component: InfrastructureComponent;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
}
