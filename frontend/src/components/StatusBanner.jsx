import React from 'react';
import { Info, AlertTriangle, CheckCircle2, Database } from 'lucide-react';

export const StatusBanner = ({
  type = 'info',
  title,
  message,
  action,
}) => {
  const styles = {
    info: {
      bg: 'bg-cyan-50 border-cyan-200 text-cyan-900',
      icon: <Info className="w-5 h-5 text-cyan-600 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
    },
    dataset: {
      bg: 'bg-slate-50 border-slate-300 text-slate-800',
      icon: <Database className="w-5 h-5 text-slate-500 flex-shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    },
  }[type] || {
    bg: 'bg-slate-50 border-slate-200 text-slate-800',
    icon: <Info className="w-5 h-5 text-slate-500 flex-shrink-0" />,
  };

  return (
    <div className={`rounded-xl border p-4 mb-6 flex items-start justify-between gap-3 ${styles.bg}`}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div>
          {title && <h4 className="text-sm font-semibold mb-0.5">{title}</h4>}
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

export default StatusBanner;
