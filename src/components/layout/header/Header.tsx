
import React from 'react';
import { useDesignStore } from '@/store/designStore';
import { HeaderLogo } from './HeaderLogo';
import { DesignTitle } from './DesignTitle';
import { HeaderActions } from './HeaderActions';

export const Header: React.FC = () => {
  const { activeDesign } = useDesignStore();
  
  return (
    <header className="bg-infra-blue px-6 py-3 flex items-center shadow-md z-10">
      <HeaderLogo />
      
      <DesignTitle />
      
      <HeaderActions />
    </header>
  );
};
