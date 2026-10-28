import React from 'react';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  UploadCloud,
  Layers,
  CircleDot,
  Server,
  ChevronLeft,
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  onSelectTab,
  isBackendHealthy,
  isOpen = true,
  onCloseSidebar,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview Dashboard',
      icon: LayoutDashboard,
      desc: 'KPIs & Churn Trends',
    },
    {
      id: 'single-predict',
      label: 'Churn Prediction',
      icon: UserCheck,
      desc: 'Single Customer Scoring',
    },
    {
      id: 'batch-predict',
      label: 'Batch Prediction',
      icon: UploadCloud,
      desc: 'CSV Upload & Scoring',
    },
    {
      id: 'segmentation',
      label: 'Customer Segmentation',
      icon: Users,
      desc: 'Cohort & Demographics',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container with Smooth Open / Close */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0B132B] text-slate-300 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800/80 shadow-2xl ${
          // Mobile visibility
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          // Desktop toggle visibility
          isOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
        }`}
      >
        {/* Brand Header with Close Button */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-white text-base tracking-tight leading-snug">
                ChurnAnalytics
              </h1>
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider block">
                Retention Intelligence
              </span>
            </div>
          </div>

          {/* Close Sidebar Button (for both desktop & mobile) */}
          <button
            type="button"
            onClick={() => {
              if (onCloseMobile) onCloseMobile();
              if (onCloseSidebar) onCloseSidebar();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Analytics &amp; Predictions
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-150 ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-400'
                  }`}
                />
                <div className="flex-1 truncate">
                  <div className="text-sm leading-tight">{item.label}</div>
                  <div className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5 truncate">
                    {item.desc}
                  </div>
                </div>
                {isActive && (
                  <div className="w-1.5 h-6 rounded-full bg-cyan-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom System Status */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 font-medium">Prediction Engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CircleDot
                className={`w-3.5 h-3.5 ${
                  isBackendHealthy === true
                    ? 'text-emerald-400 animate-pulse'
                    : isBackendHealthy === false
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              />
              <span
                className={`text-[11px] font-semibold ${
                  isBackendHealthy === true
                    ? 'text-emerald-400'
                    : isBackendHealthy === false
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {isBackendHealthy === true
                  ? 'Active'
                  : isBackendHealthy === false
                  ? 'Disconnected'
                  : 'Checking...'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
