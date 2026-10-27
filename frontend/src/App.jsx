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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Probe backend health
  const checkHealth = async () => {
    try {
      const res = await api.getHealth();
      setIsBackendHealthy(res.data?.status === 'healthy' || res.data?.model_loaded === true);
    } catch {
      setIsBackendHealthy(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkHealth();
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Titles mapping
  const pageDetails = {
    overview: {
      title: 'Overview Analytics Dashboard',
      subtitle: 'Key churn indicators, customer retention trends, and behavioral risk metrics',
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
      subtitle: 'Demographic cohorts, behavioral segments, and customer tenure progression',
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
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 transition-all">
        {/* Header */}
        <Header
          title={pageDetails.title}
          subtitle={pageDetails.subtitle}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          isBackendHealthy={isBackendHealthy}
        />

        {/* Page Container */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto" key={refreshTrigger}>
          {activeTab === 'overview' && <OverviewDashboard />}
          {activeTab === 'single-predict' && <SinglePrediction />}
          {activeTab === 'batch-predict' && <BatchPrediction />}
          {activeTab === 'segmentation' && <CustomerSegmentation />}
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
