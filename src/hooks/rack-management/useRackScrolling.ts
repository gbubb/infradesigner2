import { useState } from 'react';

export function useRackScrolling() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollStep] = useState(300);

  return {
    scrollPosition,
    setScrollPosition,
    scrollStep
  };
}