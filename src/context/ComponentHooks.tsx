import { useContext } from 'react';
import { ComponentContext } from './ComponentContext';

export const useComponents = () => {
  const context = useContext(ComponentContext);
  if (!context) {
    throw new Error('useComponents must be used within a ComponentProvider');
  }
  return context;
};