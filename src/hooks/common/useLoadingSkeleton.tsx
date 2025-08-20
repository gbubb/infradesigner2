import React, { ReactNode } from 'react';

interface UseLoadingSkeletonOptions {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  showSkeletonOnError?: boolean;
  error?: Error | null;
}

/**
 * Component wrapper for loading skeleton pattern
 */
export const WithSkeleton: React.FC<{
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  showSkeletonOnError?: boolean;
  error?: Error | null;
}> = ({ isLoading, skeleton, children, showSkeletonOnError = false, error }) => {
  if (isLoading) {
    return <>{skeleton}</>;
  }
  
  if (error && showSkeletonOnError) {
    return <>{skeleton}</>;
  }
  
  return <>{children}</>;
};