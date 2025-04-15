
import React from 'react';

export const HeaderLogo: React.FC = () => {
  return (
    <div className="flex items-center">
      <img 
        src="/lovable-uploads/c30bf602-d1c6-49c7-b6f1-48f85214b24f.png" 
        alt="Infrastructure Design Tool Logo" 
        className="h-8 w-auto mr-2"
      />
      <h1 className="text-white text-xl font-semibold">
        Infrastructure Design Tool
      </h1>
    </div>
  );
};
