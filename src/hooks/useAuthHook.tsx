import { useContext } from 'react';
import { AuthContext, type AuthContextProps } from './useAuth';

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};