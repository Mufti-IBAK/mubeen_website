import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * A simple animated skeleton placeholder for loading states.
 */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[hsl(var(--muted))] ${className}`}
      aria-hidden="true"
    />
  );
}
