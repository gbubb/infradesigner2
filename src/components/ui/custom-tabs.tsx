
import React from "react";
import { ChevronRight } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const CustomTabsList: React.FC<React.ComponentPropsWithoutRef<typeof TabsList>> = ({
  className,
  children,
  ...props
}) => (
  <TabsList
    className={cn(
      "inline-flex h-14 items-center justify-center rounded-md bg-muted p-2 text-muted-foreground",
      className
    )}
    {...props}
  >
    {React.Children.map(children, (child, index) => {
      if (index < React.Children.count(children) - 1) {
        return (
          <>
            {child}
            <ChevronRight className="h-5 w-5 mx-1 text-green-500" />
          </>
        );
      }
      return child;
    })}
  </TabsList>
);

export const CustomTabsTrigger: React.FC<React.ComponentPropsWithoutRef<typeof TabsTrigger>> = ({
  className,
  children,
  ...props
}) => (
  <TabsTrigger
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-5 py-2.5 text-base font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  >
    {children}
  </TabsTrigger>
);
