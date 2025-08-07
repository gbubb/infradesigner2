import React, { ReactNode } from 'react';

interface UseLoadingSkeletonOptions {
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  showSkeletonOnError?: boolean;
  error?: Error | null;
}

/**
 * Hook to conditionally render loading skeleton or content
 * @param options Configuration for skeleton rendering
 * @returns JSX element to render
 */
export function useLoadingSkeleton({
  isLoading,
  skeleton,
  children,
  showSkeletonOnError = false,
  error
}: UseLoadingSkeletonOptions): ReactNode {
  if (isLoading) {
    return skeleton;
  }
  
  if (error && showSkeletonOnError) {
    return skeleton;
  }
  
  return children;
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
  return (
    <>
      {useLoadingSkeleton({ isLoading, skeleton, children, showSkeletonOnError, error })}
    </>
  );
};

/**
 * Higher-order component for adding skeleton loading
 */
export function withSkeleton<P extends object>(
  Component: React.ComponentType<P>,
  SkeletonComponent: React.ComponentType
) {
  return React.forwardRef<any, P & { isLoading?: boolean; error?: Error | null }>(
    ({ isLoading = false, error = null, ...props }, ref) => {
      if (isLoading) {
        return <SkeletonComponent />;
      }
      
      return <Component {...(props as P)} ref={ref} />;
    }
  );
}