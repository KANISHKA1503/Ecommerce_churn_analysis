import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ label = 'Loading data...', size = 'md' }) => {
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-500">
      <Loader2 className={`${iconSize} animate-spin text-cyan-600 mb-2`} />
      <span className="text-sm font-medium text-slate-600">{label}</span>
    </div>
  );
};

export default LoadingSpinner;
