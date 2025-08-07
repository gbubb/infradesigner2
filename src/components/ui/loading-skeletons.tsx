import React from 'react';
import { Skeleton } from './skeleton';
import { Card, CardHeader, CardContent, CardFooter } from './card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

// Table skeleton for loading tables
export const TableSkeleton: React.FC<{ 
  rows?: number; 
  columns?: number;
  showHeader?: boolean;
}> = ({ 
  rows = 5, 
  columns = 4,
  showHeader = true 
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        {showHeader && (
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

// Card skeleton for loading cards
export const CardSkeleton: React.FC<{ 
  showHeader?: boolean;
  showFooter?: boolean;
  contentLines?: number;
}> = ({ 
  showHeader = true,
  showFooter = false,
  contentLines = 3 
}) => {
  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
      )}
      <CardContent>
        {Array.from({ length: contentLines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full mb-2" />
        ))}
      </CardContent>
      {showFooter && (
        <CardFooter>
          <Skeleton className="h-8 w-24" />
        </CardFooter>
      )}
    </Card>
  );
};

// Form skeleton for loading forms
export const FormSkeleton: React.FC<{ 
  fields?: number;
  showButtons?: boolean;
}> = ({ 
  fields = 4,
  showButtons = true 
}) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" /> {/* Label */}
          <Skeleton className="h-10 w-full" /> {/* Input */}
        </div>
      ))}
      {showButtons && (
        <div className="flex gap-2 pt-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      )}
    </div>
  );
};

// Chart skeleton for loading charts
export const ChartSkeleton: React.FC<{ 
  height?: string;
  showLegend?: boolean;
}> = ({ 
  height = "h-64",
  showLegend = true 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-32" /> {/* Title */}
        {showLegend && (
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        )}
      </div>
      <Skeleton className={`w-full ${height}`} /> {/* Chart area */}
    </div>
  );
};

// List skeleton for loading lists
export const ListSkeleton: React.FC<{ 
  items?: number;
  showIcon?: boolean;
}> = ({ 
  items = 5,
  showIcon = false 
}) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          {showIcon && <Skeleton className="h-8 w-8 rounded" />}
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Stats skeleton for loading statistics
export const StatsSkeleton: React.FC<{ 
  columns?: number;
}> = ({ 
  columns = 4 
}) => {
  return (
    <div className={`grid gap-4 grid-cols-${columns}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-16 mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Component detail skeleton
export const ComponentDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Details */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};