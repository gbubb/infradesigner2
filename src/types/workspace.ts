
import { InfrastructureComponent } from './infrastructure';

export interface Position {
  x: number;
  y: number;
}

export interface ComponentWithPosition {
  id: string;
  component: InfrastructureComponent;
  position: Position;
}
