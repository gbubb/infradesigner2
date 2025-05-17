
import React from 'react';
import { HeaderLogo } from './HeaderLogo';
import { DesignTitle } from './DesignTitle';
import { HeaderActions } from './HeaderActions';

export const Header: React.FC = () => (
  <header className="bg-infra-blue h-[54px] px-4 py-0 flex items-center z-10 shadow-md">
    {/* Use flex-row to put logo and label side-by-side, shrink height */}
    <div className="flex items-center mr-6 h-full">
      <HeaderLogo />
      <span className="text-white text-lg font-semibold leading-none ml-2">Infrastructure Design Tool</span>
    </div>
    <DesignTitle />
    <HeaderActions />
  </header>
);

