import React from 'react';
import {
  Menu,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  X,
} from 'lucide-react';

export const Header = ({
  title,
  subtitle,
  isSidebarOpen,
  onToggleSidebar,
  onOpenMobileMenu,
  onRefresh,
  isRefreshing,
  isBackendHealthy,
  activeDatasetInfo,
  onResetDataset,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Re-open Sidebar Button (ONLY if sidebar was closed by user) & Page Title */}
        <div className="flex items-center gap-3">
          {/* Desktop Re-Open Button (only visible when sidebar is closed) */}
          {!isSidebarOpen && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:inline-flex p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition items-center justify-center shadow-2xs"
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <Menu className="w-4 h-4 text-slate-700" />
            </button>
          )}

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="p-2 -ml-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 lg:hidden border border-slate-200/70"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>

          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: Dataset Pill, System Health, Refresh */}
        <div className="flex items-center gap-2.5">
          {/* Active Dataset Pill */}
          {activeDatasetInfo?.isCustom ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-cyan-50/90 text-cyan-900 border border-cyan-200/90 shadow-2xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
              <span className="font-semibold truncate max-w-[140px] sm:max-w-[200px]">
                {activeDatasetInfo.name}
              </span>
              <span className="text-cyan-700 font-bold">
                ({activeDatasetInfo.recordCount.toLocaleString()})
              </span>
              {onResetDataset && (
                <button
                  type="button"
                  onClick={onResetDataset}
                  className="ml-1 p-0.5 rounded-full hover:bg-rose-100 text-rose-600 transition"
                  title="Clear uploaded dataset"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ) : (
            <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 bg-slate-100/80 border border-slate-200/70">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span>Default Baseline</span>
            </div>
          )}

          {/* System Health Status Indicator (No Port) */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              isBackendHealthy
                ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/90'
                : 'bg-rose-50/90 text-rose-700 border-rose-200/90'
            }`}
          >
            {isBackendHealthy ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="hidden sm:inline font-semibold">System Active</span>
                <span className="sm:hidden font-semibold">Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span className="font-semibold">Offline</span>
              </>
            )}
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs transition disabled:opacity-50"
              title="Refresh dashboard data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRefreshing ? 'animate-spin text-cyan-600' : 'text-slate-500'
                }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
