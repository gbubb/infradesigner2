
import React from 'react';

export const HeaderLogo: React.FC = () => {
  return (
    <div className="flex items-center">
      <img 
        src="/lovable-uploads/471a9da5-ea26-4145-ba48-e5e9a7b8510d.png" 
        alt="Infrastructure Design Tool Logo" 
        className="h-8 w-auto mr-2"
      />
      <h1 className="text-white text-xl font-semibold">
        Infrastructure Design Tool
        <span className="text-xs font-normal ml-2 opacity-80">v11</span>
      </h1>
    </div>
  );
};
