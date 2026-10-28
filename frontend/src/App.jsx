import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import OverviewDashboard from './pages/OverviewDashboard';
import SinglePrediction from './pages/SinglePrediction';
import BatchPrediction from './pages/BatchPrediction';
import CustomerSegmentation from './pages/CustomerSegmentation';
import api from './api/apiClient';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isBackendHealthy, setIsBackendHealthy] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [activeDatasetInfo, setActiveDatasetInfo] = useState({
    isCustom: false,
    name: '',
    recordCount: 0,
  });

  // Probe backend health & check active dataset state
  const checkHealth = async () => {
    try {
      const res = await api.getHealth();
      setIsBackendHealthy(res.data?.status === 'healthy' || res.data?.model_loaded === true);
    } catch {
      setIsBackendHealthy(false);
    }
  };

  const syncActiveDatasetState = async () => {
    try {
      const res = await api.getAnalyticsOverview();
      if (res.data?.dataset_available && res.data?.total_customers > 0) {
        setActiveDatasetInfo({
          isCustom: true,
          name: res.data.dataset_name || 'Uploaded Dataset',
          recordCount: res.data.total_customers || 0,
        });
      } else {
        setActiveDatasetInfo({
          isCustom: false,
          name: '',
          recordCount: 0,
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkHealth();
    syncActiveDatasetState();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkHealth();
    await syncActiveDatasetState();
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleDatasetActivated = (info) => {
    setActiveDatasetInfo({
      isCustom: true,
      name: info.name || 'Uploaded CSV',
      recordCount: info.recordCount || 0,
    });
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleResetDataset = async () => {
    try {
      setIsRefreshing(true);
      await api.resetDataset();
      setActiveDatasetInfo({
        isCustom: false,
        name: '',
        recordCount: 0,
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to reset dataset:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadScoredCsv = async () => {
    try {
      const res = await api.downloadScoredCsv();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scored_customer_predictions_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to download scored CSV: ' + err.message);
    }
  };

  // Titles mapping
  const pageDetails = {
    overview: {
      title: 'Overview Analytics Dashboard',
      subtitle: activeDatasetInfo.isCustom
        ? `Visualizing live metrics from active file: ${activeDatasetInfo.name} (${activeDatasetInfo.recordCount.toLocaleString()} records)`
        : 'Predictive customer churn indicators, retention trends, and behavioral risk metrics',
    },
    'single-predict': {
      title: 'Customer Churn Prediction',
      subtitle: 'Score customer churn probability and risk categorization in real-time',
    },
    'batch-predict': {
      title: 'Batch Churn Prediction',
      subtitle: 'Upload CSV dataset for batch customer churn evaluation and results export',
    },
    segmentation: {
      title: 'Customer Segmentation',
      subtitle: activeDatasetInfo.isCustom
        ? `Cohort breakdowns computed directly from active file: ${activeDatasetInfo.name}`
        : 'Demographic cohorts, behavioral segments, and customer tenure progression',
    },
  }[activeTab] || {
    title: 'E-Commerce Churn Analytics',
    subtitle: 'Machine Learning Analytics Platform',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isBackendHealthy={isBackendHealthy}
        isOpen={isSidebarOpen}
        onCloseSidebar={() => setIsSidebarOpen(false)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'
        }`}
      >
        {/* Header */}
        <Header
          title={pageDetails.title}
          subtitle={pageDetails.subtitle}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          isBackendHealthy={isBackendHealthy}
          activeDatasetInfo={activeDatasetInfo}
          onResetDataset={activeDatasetInfo.isCustom ? handleResetDataset : null}
        />

        {/* Global Active Dataset Notification Bar */}
        {activeDatasetInfo.isCustom && (
          <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-slate-900 text-white px-6 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs border-b border-cyan-800">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 font-bold uppercase tracking-wider text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Custom Dataset Active
              </span>
              <span className="font-semibold text-white">{activeDatasetInfo.name}</span>
              <span className="text-slate-300">
                &bull; <strong className="text-white">{activeDatasetInfo.recordCount.toLocaleString()}</strong> customer accounts scored. All sections below are visualizing this file.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadScoredCsv}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded transition text-xs shadow-xs"
              >
                Download Scored CSV
              </button>
              {activeTab !== 'overview' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded font-medium transition text-xs"
                >
                  View Overview
                </button>
              )}
              {activeTab !== 'segmentation' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('segmentation')}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded font-medium transition text-xs"
                >
                  View Segmentation
                </button>
              )}
              {activeTab !== 'batch-predict' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('batch-predict')}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded font-medium transition text-xs"
                >
                  Upload New CSV
                </button>
              )}
              <button
                type="button"
                onClick={handleResetDataset}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded transition text-xs shadow-xs"
                title="Clear active dataset"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Page Container */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto" key={refreshTrigger}>
          {activeTab === 'overview' && (
            <OverviewDashboard
              activeDatasetInfo={activeDatasetInfo}
              onDatasetActivated={handleDatasetActivated}
              onResetDataset={handleResetDataset}
              onNavigateToBatch={() => setActiveTab('batch-predict')}
            />
          )}
          {activeTab === 'single-predict' && <SinglePrediction />}
          {activeTab === 'batch-predict' && (
            <BatchPrediction
              activeDatasetInfo={activeDatasetInfo}
              onDatasetActivated={handleDatasetActivated}
              onResetDataset={handleResetDataset}
              onNavigateToOverview={() => setActiveTab('overview')}
              onNavigateToSegmentation={() => setActiveTab('segmentation')}
            />
          )}
          {activeTab === 'segmentation' && (
            <CustomerSegmentation
              activeDatasetInfo={activeDatasetInfo}
              onResetDataset={handleResetDataset}
              onNavigateToBatch={() => setActiveTab('batch-predict')}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 border-t border-slate-200/80 bg-white text-center text-xs text-slate-400">
          E-Commerce Churn &amp; Behaviour Analytics Platform &bull; Customer Retention Intelligence
        </footer>
      </div>
    </div>
  );
}

export default App;
