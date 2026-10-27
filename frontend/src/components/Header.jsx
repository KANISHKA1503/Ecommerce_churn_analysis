import React from 'react';
import { Menu, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const Header = ({
  title,
  subtitle,
  onOpenMobileMenu,
  onRefresh,
  isRefreshing,
  isBackendHealthy,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile trigger & Page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions & API status badge */}
        <div className="flex items-center gap-3">
          {/* Status pill */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              isBackendHealthy
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {isBackendHealthy ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>API Online (Port 8000)</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Backend Offline</span>
              </>
            )}
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition disabled:opacity-50"
              title="Refresh page data from backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-600' : ''}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
