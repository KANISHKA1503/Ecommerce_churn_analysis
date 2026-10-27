import React from 'react';

export const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = 'neutral',
  accentColor = 'teal',
}) => {
  const accentBorder = {
    teal: 'border-l-4 border-l-cyan-500',
    blue: 'border-l-4 border-l-blue-500',
    rose: 'border-l-4 border-l-rose-500',
    emerald: 'border-l-4 border-l-emerald-500',
    amber: 'border-l-4 border-l-amber-500',
    purple: 'border-l-4 border-l-purple-500',
  }[accentColor] || 'border-l-4 border-l-cyan-500';

  const iconBg = {
    teal: 'bg-cyan-50 text-cyan-600',
    blue: 'bg-blue-50 text-blue-600',
    rose: 'bg-rose-50 text-rose-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  }[accentColor] || 'bg-cyan-50 text-cyan-600';

  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  }[badgeVariant] || 'bg-slate-100 text-slate-600 border border-slate-200';

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200/80 p-5 ${accentBorder} transition hover:shadow-md`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold tracking-tight text-slate-900">
          {value !== undefined && value !== null ? value : '—'}
        </div>
        {badgeText && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeStyles}`}>
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 line-clamp-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default MetricCard;
