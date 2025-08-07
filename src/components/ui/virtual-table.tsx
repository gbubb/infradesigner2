import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface VirtualTableColumn<T> {
  header: string | React.ReactNode;
  accessor?: keyof T | ((item: T) => React.ReactNode);
  className?: string;
  headerClassName?: string;
}

interface VirtualTableProps<T> {
  data: T[];
  columns: VirtualTableColumn<T>[];
  rowHeight?: number;
  overscan?: number;
  className?: string;
  tableClassName?: string;
  getRowKey: (item: T, index: number) => string | number;
  emptyMessage?: string;
  renderRow?: (item: T, index: number) => React.ReactNode;
}

export function VirtualTable<T>({
  data,
  columns,
  rowHeight = 56,
  overscan = 5,
  className,
  tableClassName,
  getRowKey,
  emptyMessage = "No items found",
  renderRow
}: VirtualTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => rowHeight, [rowHeight]),
    overscan,
  });

  const getCellContent = (item: T, column: VirtualTableColumn<T>) => {
    if (!column.accessor) return null;
    if (typeof column.accessor === 'function') {
      return column.accessor(item);
    }
    return String(item[column.accessor] ?? '');
  };

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={cn("rounded-md border", className)}>
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
              <TableHead key={index} className={column.headerClassName}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
      </Table>
      
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: '600px' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {data.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <Table className={cn("border-0", tableClassName)}>
              <TableBody>
                {virtualItems.map((virtualItem) => {
                  const item = data[virtualItem.index];
                  const key = getRowKey(item, virtualItem.index);
                  
                  return (
                    <TableRow
                      key={key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      {renderRow ? (
                        renderRow(item, virtualItem.index)
                      ) : (
                        columns.map((column, colIndex) => (
                          <TableCell key={colIndex} className={column.className}>
                            {getCellContent(item, column)}
                          </TableCell>
                        ))
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}