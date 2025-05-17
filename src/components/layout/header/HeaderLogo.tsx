
import React from 'react';

export const HeaderLogo: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center mr-4">
      <img 
        src="/lovable-uploads/c30bf602-d1c6-49c7-b6f1-48f85214b24f.png" 
        alt="Infrastructure Design Tool Logo" 
        className="h-16 w-auto mb-1 drop-shadow-lg"
      />
      <h1 className="text-white text-lg font-semibold leading-tight text-center drop-shadow">
        Infrastructure<br />
        Design Tool
      </h1>
    </div>
  );
};
