import React, { useState, useEffect } from 'react';
import {
  Users,
  BarChart3,
  Calendar,
  Layers,
  Database,
  UploadCloud,
  Download,
  Camera,
  Printer,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

import api from '../api/apiClient';
import StatusBanner from '../components/StatusBanner';
import LoadingSpinner from '../components/LoadingSpinner';
import { downloadVisualAsPng, exportVisualAsPdf } from '../utils/exportVisuals';

export const CustomerSegmentation = ({
  activeDatasetInfo,
  onResetDataset,
  onNavigateToBatch,
}) => {
  const [loading, setLoading] = useState(true);
  const [exportingPng, setExportingPng] = useState(false);
  const [error, setError] = useState(null);
  const [segments, setSegments] = useState(null);
  const [distribution, setDistribution] = useState(null);

  const fetchSegmentationData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [segRes, distRes] = await Promise.allSettled([
        api.getSegments(),
        api.getChurnDistribution(),
      ]);

      if (segRes.status === 'fulfilled') setSegments(segRes.value.data);
      if (distRes.status === 'fulfilled') setDistribution(distRes.value.data);
    } catch (err) {
      setError(err.message || 'Failed to load segmentation analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegmentationData();
  }, []);

  const handleDownloadScoredCsv = async () => {
    try {
      const res = await api.downloadScoredCsv();
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      const safeName = (segments?.dataset_name || 'customer_segments').replace(/\s+/g, '_').replace('.csv', '');
      link.setAttribute('download', `scored_${safeName}_cohorts.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to download scored CSV: ' + err.message);
    }
  };

  const handleExportSegmentationPng = async () => {
    setExportingPng(true);
    await downloadVisualAsPng('segmentation-visuals-export', `segmentation_visuals_${Date.now()}.png`);
    setExportingPng(false);
  };

  const handleExportSingleChart = (chartId, chartName) => {
    downloadVisualAsPng(chartId, `${chartName}_${Date.now()}.png`);
  };

  const handleLoadDemoBaseline = async () => {
    try {
      setLoading(true);
      await api.loadBaseline();
      await fetchSegmentationData();
    } catch (err) {
      setError(err.message || 'Failed to load demo baseline.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading customer segmentation cohorts..." size="lg" />;
  }

  const isDatasetAvailable = segments?.dataset_available === true;
  const tenureCohorts = segments?.tenure_segments || [];
  const categorySegments = segments?.order_category_segments || [];
  const genderSegments = segments?.gender_segments || [];
  const maritalSegments = segments?.marital_status_segments || [];
  const totalAccounts = segments?.total_customers || 0;

  /* -------------------------------------------------------------
     VIEW A: INITIAL EMPTY STATE (NO CSV UPLOADED YET)
     ------------------------------------------------------------- */
  if (!isDatasetAvailable) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8">
        {error && (
          <StatusBanner
            type="warning"
            title="Notification"
            message={error}
          />
        )}

        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-cyan-100/70 text-cyan-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Layers className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Customer Segmentation Cohorts
          </h2>
          <p className="text-xs text-slate-500 mb-6 max-w-md mx-auto">
            Upload your customer dataset to calculate tenure lifecycle progression, product category risk tables, and demographic segments.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {onNavigateToBatch && (
              <button
                type="button"
                onClick={onNavigateToBatch}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-xl text-xs shadow-sm transition"
              >
                <UploadCloud className="w-4 h-4" />
                Upload Customer CSV
              </button>
            )}
            <button
              type="button"
              onClick={handleLoadDemoBaseline}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs transition"
            >
              <Database className="w-4 h-4 text-cyan-600" />
              Load Demo Dataset (5.6k)
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------
     VIEW B: ACTIVE SEGMENTATION (CSV UPLOADED)
     Visual-first, uncluttered, with Visuals (PNG), PDF, and CSV download
     ------------------------------------------------------------- */
  return (
    <div className="space-y-6" id="segmentation-visuals-export">
      {error && (
        <StatusBanner
          type="warning"
          title="Notification"
          message={error}
        />
      )}

      {/* Top Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-export">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
          <span className="font-bold text-sm text-slate-900">
            {segments.dataset_name || 'Active Customer Cohorts'}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            ({totalAccounts.toLocaleString()} customer accounts)
          </span>
        </div>

        {/* Visual Export & CSV Download Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Download Visuals as PNG */}
          <button
            type="button"
            onClick={handleExportSegmentationPng}
            disabled={exportingPng}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 text-xs font-semibold shadow-xs transition disabled:opacity-50"
            title="Download complete visual segmentation as a high-resolution PNG image"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-700" />
            {exportingPng ? 'Capturing Image...' : 'Save Visuals (PNG)'}
          </button>

          {/* Export PDF / Print */}
          <button
            type="button"
            onClick={exportVisualAsPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
            title="Print or save as executive PDF report"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Export PDF
          </button>

          {/* Download Scored CSV */}
          <button
            type="button"
            onClick={handleDownloadScoredCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
            title="Download scored customer cohort records as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          {onNavigateToBatch && (
            <button
              type="button"
              onClick={onNavigateToBatch}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
            >
              Upload New
            </button>
          )}
          {onResetDataset && (
            <button
              type="button"
              onClick={onResetDataset}
              className="px-2 py-1.5 text-xs text-rose-600 hover:text-rose-800 transition font-semibold"
              title="Clear active dataset"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Tenure Cohorts Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tenureCohorts.map((cohort, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              {cohort.TenureCohort}
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-slate-900">
                {cohort.total_customers}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                cohort.churn_rate_percent > 30
                  ? 'bg-rose-50 text-rose-700'
                  : cohort.churn_rate_percent > 15
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {cohort.churn_rate_percent}% churn
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {cohort.churned_customers} at-risk / {cohort.retained_customers} loyal
            </p>
          </div>
        ))}
      </div>

      {/* Grid: Tenure Progression Chart & Demographic Cohorts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 break-inside-avoid">
        {/* Tenure Cohort Bar Chart */}
        <div id="chart-tenure-progression" className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Tenure Lifecycle Churn Progression
            </h3>
            <button
              type="button"
              onClick={() => handleExportSingleChart('chart-tenure-progression', 'tenure_lifecycle')}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition no-export"
              title="Download chart as image"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tenureCohorts}
                margin={{ top: 10, right: 10, left: -20, bottom: 15 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="TenureCohort"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val}% churn (${item?.payload?.total_customers || 0} accounts)`,
                    'Attrition Rate',
                  ]}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="churn_rate_percent" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender & Marital Demographics */}
        <div id="chart-demographic-cohorts" className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-slate-900 text-sm">
              Demographic Attrition Rates
            </h3>
            <button
              type="button"
              onClick={() => handleExportSingleChart('chart-demographic-cohorts', 'demographic_cohorts')}
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition no-export"
              title="Download chart as image"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  ...genderSegments.map((d) => ({
                    cohort: d.category,
                    rate: d.churn_rate_percent,
                    count: d.total_customers,
                  })),
                  ...maritalSegments.map((d) => ({
                    cohort: d.category,
                    rate: d.churn_rate_percent,
                    count: d.total_customers,
                  })),
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 15 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="cohort"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(val, name, item) => [
                    `${val}% (${item?.payload?.count || 0} accounts)`,
                    'Churn Rate',
                  ]}
                  contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Product Category Risk Table */}
      <div id="category-risk-table" className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs break-inside-avoid">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 text-sm">
            Product Category Risk Matrix
          </h3>
          <button
            type="button"
            onClick={() => handleExportSingleChart('category-risk-table', 'category_risk_table')}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition no-export"
            title="Download table as image"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 font-semibold text-right">Customers</th>
                <th className="py-2.5 px-3 font-semibold text-right">Retained Base</th>
                <th className="py-2.5 px-3 font-semibold text-right">At-Risk</th>
                <th className="py-2.5 px-3 font-semibold text-right">Churn Rate</th>
                <th className="py-2.5 px-3 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {categorySegments.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition">
                  <td className="py-2.5 px-3 font-medium text-slate-900">{row.category}</td>
                  <td className="py-2.5 px-3 text-right">{row.total_customers.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-cyan-700 font-medium">
                    {row.retained_customers.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-600 font-medium">
                    {row.churned_customers.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold">
                    {row.churn_rate_percent}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        row.churn_rate_percent > 25
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : row.churn_rate_percent > 12
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {row.churn_rate_percent > 25 ? 'High Risk' : row.churn_rate_percent > 12 ? 'Moderate' : 'Low Risk'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerSegmentation;
