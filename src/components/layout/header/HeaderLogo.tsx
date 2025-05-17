
import React from 'react';

export const HeaderLogo: React.FC = () => {
  // Larger logo, center aligned, with text below logo in new sidebar/topbar frame
  return (
    <div className="flex flex-col items-center justify-center mr-5">
      <img 
        src="/lovable-uploads/c30bf602-d1c6-49c7-b6f1-48f85214b24f.png" 
        alt="Infrastructure Design Tool Logo" 
        className="h-18 w-auto mb-1 drop-shadow-lg"
        style={{ height: 64, maxWidth: 76 }}
      />
      <h1 className="text-white text-base font-semibold leading-tight text-center drop-shadow mt-0.5">
        Infrastructure<br />
        Design Tool
      </h1>
    </div>
  );
};
