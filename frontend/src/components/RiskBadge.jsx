import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export const RiskBadge = ({ level, size = 'md' }) => {
  const normalized = (level || '').toLowerCase();

  const isLow = normalized.includes('low') || normalized.includes('retained');
  const isMedium = normalized.includes('medium') || normalized.includes('moderate');
  const isHigh = normalized.includes('high') || normalized.includes('churned');

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : size === 'lg' 
    ? 'px-3.5 py-1.5 text-sm font-semibold' 
    : 'px-2.5 py-1 text-xs font-medium';

  if (isHigh) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
        <AlertOctagon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        {level}
      </span>
    );
  }

  if (isMedium) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
        <AlertTriangle className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
        {level}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
      <ShieldCheck className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
      {level || 'Low Risk'}
    </span>
  );
};

export default RiskBadge;
