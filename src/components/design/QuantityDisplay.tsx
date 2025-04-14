import React from 'react';
import { CalculationBreakdown } from './CalculationBreakdown';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QuantityDisplayProps {
  roleId: string;
  roleName: string;
  quantity: number | null;
  isAdjusted: boolean;
  onQuantityChange?: (newQuantity: number | null) => void;
  isEditable?: boolean;
}

export const QuantityDisplay: React.FC<QuantityDisplayProps> = ({
  roleId,
  roleName,
  quantity,
  isAdjusted,
  onQuantityChange,
  isEditable = false
}) => {

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onQuantityChange) {
      const value = event.target.value;
      const num = value === '' ? null : parseInt(value, 10);
      if (value === '' || (!isNaN(num) && num >= 0)) {
        onQuantityChange(num);
      }
    }
  };

  const displayValue = quantity === null ? '' : quantity.toString();

  return (
    <div className="flex items-center space-x-1">
      {isEditable ? (
        <Input
          type="number"
          value={displayValue}
          onChange={handleInputChange}
          className={`h-7 text-sm ${isAdjusted ? 'font-bold text-orange-600' : ''}`}
          min="0"
          style={{ width: '60px' }}
        />
      ) : (
        <span className={`text-sm ${isAdjusted ? 'font-bold text-orange-600' : ''}`}>
          {quantity ?? 'N/A'}
        </span>
      )}
      <CalculationBreakdown roleId={roleId} roleName={roleName} />
      {isAdjusted && !isEditable && (
        <span className="text-xs text-orange-500 ml-1">(Adjusted)</span>
      )}
    </div>
  );
};
