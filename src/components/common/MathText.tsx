import React from 'react';

export const MathText: React.FC<{ children: React.ReactNode; className?: string }> =
  ({ children, className }) => (
    <span dir="ltr" style={{ unicodeBidi: 'isolate' }} className={className}>{children}</span>
  );