import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserX,
  UserCheck,
  TrendingDown,
  Award,
  BarChart2,
  PieChart as PieIcon,
  UploadCloud,
  Download,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Cpu,
  FileSpreadsheet,
  Camera,
  Printer,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

import api from '../api/apiClient';
import MetricCard from '../components/MetricCard';
import StatusBanner from '../components/StatusBanner';
import LoadingSpinner from '../components/LoadingSpinner';
import { downloadVisualAsPng, exportVisualAsPdf } from '../utils/exportVisuals';

const COLORS = ['#0891b2', '#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export const OverviewDashboard = ({
  activeDatasetInfo,
  onDatasetActivated,
  onResetDataset,
  onNavigateToBatch,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [featureImportance, setFeatureImportance] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [segments, setSegments] = useState(null);
  const fileInputRef = useRef(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, featRes, infoRes, distRes, segRes] = await Promise.allSettled([
        api.getAnalyticsOverview(),
        api.getFeatureImportance(),
        api.getModelInfo(),
        api.getChurnDistribution(),
        api.getSegments(),
      ]);

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data);
      if (featRes.status === 'fulfilled') setFeatureImportance(featRes.value.data.feature_importance || []);
      if (infoRes.status === 'fulfilled') setModelInfo(infoRes.value.data);
      if (distRes.status === 'fulfilled') setDistribution(distRes.value.data);
      if (segRes.status === 'fulfilled') setSegments(segRes.value.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Helper to extract clean numeric value from strings like "1m", "$29.85", "14%"
  const cleanNumeric = (val, defaultVal = 0) => {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
    const match = String(val).replace(/,/g, '').match(/[-+]?\d*\.?\d+/);
    if (match) {
      const num = parseFloat(match[0]);
      return isNaN(num) ? defaultVal : num;
    }
    return defaultVal;
  };

  // Quick CSV upload directly from dashboard
  const handleQuickUpload = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await api.uploadDatasetCsv(formData);
      await fetchDashboardData();

      if (onDatasetActivated && res.data?.overview) {
        onDatasetActivated({
          isCustom: true,
          name: selectedFile.name,
          recordCount: res.data.overview.total_customers || 0,
        });
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.message ||
        'Failed to upload and process CSV dataset.';
      setError(errorMsg);
    } finally {
      setLoading(false);
      // Reset input value so same file can be re-uploaded if needed
      e.target.value = '';
    }
  };

  // Sample CSV generator for immediate testing
  const handleDownloadSampleCsv = () => {
    const sampleCsvContent = `CustomerID,Tenure,CityTier,WarehouseToHome,HourSpendOnApp,NumberOfDeviceRegistered,SatisfactionScore,NumberOfAddress,Complain,OrderAmountHikeFromlastYear,CouponUsed,OrderCount,DaySinceLastOrder,CashbackAmount,PreferredLoginDevice,PreferredPaymentMode,Gender,PreferedOrderCat,MaritalStatus
50001,15.0,1,12.0,3.0,3,4,2,0,15.0,1.0,2.0,3.0,165.0,Mobile Phone,Debit Card,Female,Fashion,Married
50002,1.0,3,35.0,2.0,4,1,6,1,11.0,0.0,1.0,28.0,110.0,Computer,COD,Male,Mobile Phone,Single
50003,28.0,1,7.0,4.0,2,5,3,0,19.0,4.0,7.0,1.0,240.0,Mobile Phone,Credit Card,Female,Grocery,Married
50004,3.0,2,22.0,2.0,3,2,4,1,13.0,1.0,1.0,15.0,135.0,Phone,E wallet,Male,Laptop & Accessory,Single
50005,18.0,1,10.0,3.0,3,4,2,0,16.0,2.0,3.0,4.0,180.0,Mobile Phone,Debit Card,Female,Laptop & Accessory,Divorced
50006,0.0,3,30.0,1.0,5,1,8,1,12.0,0.0,1.0,32.0,100.0,Computer,COD,Male,Mobile,Single`;

    const blob = new Blob([sampleCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_customers_test.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export scored CSV from backend
  const handleDownloadScoredCsv = async () => {
    try {
      const res = await api.downloadScoredCsv();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      const safeName = (overview?.dataset_name || 'customer_churn').replace(/\s+/g, '_').replace('.csv', '');
      link.setAttribute('download', `scored_${safeName}_results.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to download scored CSV: ' + err.message);
    }
  };

  // Load demo baseline optionally
  const handleLoadDemoBaseline = async () => {
    try {
      setLoading(true);
      await api.loadBaseline();
      await fetchDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to load demo baseline.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to trigger single chart PNG export
  const handleExportSingleChart = (elementId, chartName) => {
    downloadVisualAsPng(elementId, `${chartName}_visual.png`);
  };

  if (loading) {
    return <LoadingSpinner label="Loading analytics engine..." size="lg" />;
  }

  const isDatasetAvailable = overview?.dataset_available === true && overview?.total_customers > 0;

  // Clean human-readable display names for behavioral churn drivers
  const FEATURE_DISPLAY_NAMES = {
    Tenure: 'Customer Tenure',
    Complain: 'Customer Complaints',
    'PreferedOrderCat_Fashion': 'Category: Fashion',
    'PreferedOrderCat_Laptop & Accessory': 'Category: Laptop & Acc',
    'PreferedOrderCat_Mobile Phone': 'Category: Mobile Phone',
    'PreferedOrderCat_Mobile': 'Category: Mobile Devices',
    'MaritalStatus_Married': 'Marital: Married',
    'MaritalStatus_Single': 'Marital: Single',
    'PreferredPaymentMode_E wallet': 'Payment: E-Wallet',
    'NumberOfDeviceRegistered': 'Registered Devices',
    'DaySinceLastOrder': 'Days Since Last Order',
    'WarehouseToHome': 'Warehouse Distance',
    'CashbackAmount': 'Cashback Amount',
    'SatisfactionScore': 'Satisfaction Score',
    'OrderAmountHikeFromlastYear': 'Annual Spend Hike %',
    'HourSpendOnApp': 'Daily App Hours',
    'CityTier': 'City Tier',
    'CouponUsed': 'Coupons Used',
    'OrderCount': 'Total Orders',
    'NumberOfAddress': 'Saved Addresses',
    'Complaint_Impact': 'Complaint Impact',
    'Distance_Risk': 'Distance Risk',
    'Engagement_Score': 'Engagement Score',
  };

  const topFeatures = (featureImportance.length > 0 ? featureImportance : [
    { feature: 'Tenure', importance: 0.285 },
    { feature: 'Complain', importance: 0.174 },
    { feature: 'PreferedOrderCat_Fashion', importance: 0.089 },
    { feature: 'PreferedOrderCat_Laptop & Accessory', importance: 0.076 },
    { feature: 'NumberOfDeviceRegistered', importance: 0.068 },
    { feature: 'DaySinceLastOrder', importance: 0.061 },
    { feature: 'WarehouseToHome', importance: 0.054 },
    { feature: 'CashbackAmount', importance: 0.048 },
  ]).slice(0, 8).map((f) => {
    const raw = f.feature.replace('num__', '').replace('cat__', '');
    return {
      name: FEATURE_DISPLAY_NAMES[raw] || raw.replace(/_/g, ' '),
      importance: +(f.importance * 100).toFixed(1),
    };
  });

  const totalCount = overview?.total_customers || 0;
  const retainedCount = overview?.retained_customers || 0;
  const churnedCount = overview?.churned_customers || 0;
  const churnRate = overview?.overall_churn_rate_percent || 0.0;
  const retentionRate = overview?.retention_rate_percent || 0.0;

  const churnDonutData = [
    { name: 'Retained Customers', value: retainedCount },
    { name: 'Churned Customers', value: churnedCount },
  ];

  /* -------------------------------------------------------------
     VIEW A: INITIAL STATE (NO CSV UPLOADED YET)
     Informative system overview + welcome message + workflow steps + CSV upload dropzone
     ------------------------------------------------------------- */
  if (!isDatasetAvailable) {
    return (
      <div className="space-y-6">
        {error && (
          <StatusBanner
            type="warning"
            title="Notification"
            message={error}
          />
        )}

        {/* Hero Welcome Banner with Overview of the App */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-8 border border-slate-800 shadow-md">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Customer Retention Intelligence Platform
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-3">
              Predict &amp; Prevent Customer Churn in Real-Time
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Welcome to the ChurnAnalytics Platform. Upload customer interaction data to automatically evaluate retention probabilities, uncover early warning attrition signals, and examine cohort segmentation using machine learning.
            </p>
          </div>
          {/* Subtle Decorative Gradient Orb */}
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* 3-Step Workflow Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 font-bold mb-3">
              1
            </div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">
              Upload Customer CSV
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Provide store customer profiles with tenure, app usage, order recency, cashback, and support tickets.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold mb-3">
              2
            </div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">
              Automated Risk Scoring
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Features are scaled and classified against trained customer retention patterns to assign risk levels.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold mb-3">
              3
            </div>
            <h4 className="font-semibold text-slate-900 text-sm mb-1">
              Explore &amp; Download Results
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Inspect tenure cohorts, category churn metrics, and export the scored CSV with retention recommendations.
            </p>
          </div>
        </div>

        {/* Interactive Upload Card right on Dashboard */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Get Started: Ingest Customer Dataset
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload your customer CSV below to activate live visualizations across the entire dashboard.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSampleCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Download Sample CSV
              </button>
              <button
                type="button"
                onClick={handleLoadDemoBaseline}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 text-xs font-semibold transition"
              >
                <Database className="w-3.5 h-3.5 text-cyan-600" />
                Load Demo Dataset
              </button>
            </div>
          </div>

          {/* Drag & Drop Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-xl p-8 text-center cursor-pointer transition bg-slate-50/60 hover:bg-cyan-50/20"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleQuickUpload}
              accept=".csv"
              className="hidden"
            />
            <UploadCloud className="w-10 h-10 mx-auto text-cyan-600 mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              Click to browse or drop your customer CSV file here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports standard customer dataset attributes (Tenure, Warehouse Distance, Order Hike, Cashback, etc.)
            </p>
          </div>
        </div>

        {/* Platform Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
              <ShieldCheck className="w-4 h-4 text-cyan-600" />
              <span>Retention Decision Support</span>
            </div>
            <p className="text-slate-500">
              Classifies customer risk into Low, Medium, and High tiers with tailored outreach recommendations.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Dynamic Feature Engineering</span>
            </div>
            <p className="text-slate-500">
              Automatically derives Complaint Impact, Distance Risk, and Composite Engagement scores during inference.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>One-Click Results Export</span>
            </div>
            <p className="text-slate-500">
              Export fully scored predictions with individual probability scores and customer metadata as a CSV.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     VIEW B: ACTIVE VISUALIZATION STATE (CSV HAS BEEN UPLOADED)
     All 5 KPI cards + Donut + Risk drivers + Category + Demographic charts + Visual Exports
     ------------------------------------------------------------- */
  return (
    <div id="overview-dashboard-container" className="space-y-6">
      {error && (
        <StatusBanner
          type="warning"
          title="Notification"
          message={error}
        />
      )}

      {/* Active Dataset Header with Visual & Scored CSV Download Actions */}
      <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 text-[10px] font-bold uppercase tracking-wider">
              Active Dataset Scored
            </span>
            <span className="font-bold text-sm text-white">
              {overview.dataset_name || 'Uploaded Customer File'}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Visualizing live metrics for <strong>{totalCount.toLocaleString()}</strong> customer accounts &bull; Overall Churn Rate: <strong>{churnRate}%</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 no-export">
          <button
            type="button"
            onClick={() => downloadVisualAsPng('overview-dashboard-container', 'dashboard-visuals.png')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg text-xs transition shadow-2xs"
            title="Download full dashboard as high-resolution PNG image"
          >
            <Camera className="w-3.5 h-3.5" />
            Save Visuals (PNG)
          </button>
          <button
            type="button"
            onClick={exportVisualAsPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs transition"
            title="Print or export as PDF report"
          >
            <Printer className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadScoredCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-2xs"
            title="Export scored dataset as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Download Scored CSV
          </button>
          {onNavigateToBatch && (
            <button
              type="button"
              onClick={onNavigateToBatch}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition"
            >
              Upload New CSV
            </button>
          )}
          {onResetDataset && (
            <button
              type="button"
              onClick={onResetDataset}
              className="px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold transition"
              title="Clear active dataset"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 5 Business Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <MetricCard
          title="Total Customers"
          value={totalCount.toLocaleString()}
          subtitle="Evaluated Accounts"
          icon={Users}
          accentColor="blue"
        />

        <MetricCard
          title="Retained Customers"
          value={retainedCount.toLocaleString()}
          subtitle="Predicted Active"
          icon={UserCheck}
          accentColor="emerald"
          badgeText="Loyal"
          badgeVariant="success"
        />

        <MetricCard
          title="Churned Customers"
          value={churnedCount.toLocaleString()}
          subtitle="At-Risk Accounts"
          icon={UserX}
          accentColor="rose"
          badgeText="At Risk"
          badgeVariant="danger"
        />

        <MetricCard
          title="Churn Rate"
          value={`${churnRate}%`}
          subtitle="Attrition Ratio"
          icon={TrendingDown}
          accentColor="amber"
          badgeText={churnRate > 25 ? 'Elevated' : 'Normal'}
          badgeVariant={churnRate > 25 ? 'danger' : 'warning'}
        />

        <MetricCard
          title="Retention Rate"
          value={`${retentionRate}%`}
          subtitle="Loyalty Ratio"
          icon={Award}
          accentColor="cyan"
          badgeText={retentionRate >= 80 ? 'Healthy' : 'Needs Action'}
          badgeVariant="success"
        />
      </div>

      {/* Grid: Churn Distribution Donut & Top Churn Risk Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Retention vs Churn Donut (5 cols) */}
        <div id="chart-churn-donut-card" className="lg:col-span-5 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                Churn Distribution
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExportSingleChart('chart-churn-donut-card', 'churn_distribution')}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition no-export"
                  title="Download chart as image"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <PieIcon className="w-4 h-4 text-cyan-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Retention proportion evaluated for active file
            </p>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={churnDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#0891b2" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`${Number(val).toLocaleString()} accounts`, 'Volume']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-slate-700 font-medium">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Retained Base: <strong className="text-cyan-700">{retentionRate}%</strong></span>
            <span>At-Risk Ratio: <strong className="text-rose-600">{churnRate}%</strong></span>
          </div>
        </div>

        {/* Top Churn Risk Drivers (7 cols) */}
        <div id="chart-feature-importance-card" className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                Top Churn Risk Drivers
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExportSingleChart('chart-feature-importance-card', 'churn_risk_drivers')}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition no-export"
                  title="Download chart as image"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <BarChart2 className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Key customer behaviors and factors influencing churn likelihood
            </p>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topFeatures}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 90, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11, fill: '#334155' }}
                    width={90}
                  />
                  <Tooltip
                    formatter={(val) => [`${val}% relative weight`, 'Impact Factor']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="importance" fill="#0891b2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Primary Churn Factor: <strong className="text-slate-800">Customer Tenure &amp; Recent Experience</strong></span>
            <span className="text-[11px] text-slate-400">Behavioral Influence Analysis</span>
          </div>
        </div>
      </div>

      {/* Grid: Category and Demographic Churn Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Churn by Preferred Order Category */}
        <div id="chart-order-category-card" className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900 text-sm">
              Churn by Preferred Order Category
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleExportSingleChart('chart-order-category-card', 'order_category_churn')}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition no-export"
                title="Download chart as image"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Category
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Live distribution per order category for uploaded records
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={distribution?.by_preferred_order_category || []}
                margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val}% churn rate (${item?.payload?.total_customers || 0} accounts)`,
                    'Category Risk',
                  ]}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="churn_rate_percent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demographic Churn Rates */}
        <div id="chart-demographics-card" className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900 text-sm">
              Demographic Churn Rates
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleExportSingleChart('chart-demographics-card', 'demographic_churn')}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition no-export"
                title="Download chart as image"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                Demographics
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Segment comparison across Gender &amp; Marital Status
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  ...(distribution?.by_gender || []).map((d) => ({
                    segment: `Gender: ${d.category}`,
                    rate: d.churn_rate_percent,
                    count: d.total_customers,
                  })),
                  ...(distribution?.by_marital_status || []).map((d) => ({
                    segment: `Status: ${d.category}`,
                    rate: d.churn_rate_percent,
                    count: d.total_customers,
                  })),
                ]}
                margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="segment"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val}% (${item?.payload?.count || 0} customers)`,
                    'Churn Rate',
                  ]}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;
