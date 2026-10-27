import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Info,
} from 'lucide-react';

import api from '../api/apiClient';
import RiskBadge from '../components/RiskBadge';
import StatusBanner from '../components/StatusBanner';
import LoadingSpinner from '../components/LoadingSpinner';

export const BatchPrediction = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [batchResults, setBatchResults] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('ALL');
  const fileInputRef = useRef(null);

  // Parse CSV text into array of objects
  const parseCSV = (csvText) => {
    const lines = csvText.trim().split(/\r\n|\n/);
    if (lines.length < 2) throw new Error('CSV must contain at least a header row and one customer data row.');

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting (supporting quoted values if any)
      const values = line.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''));
      const row = {};

      headers.forEach((header, index) => {
        const val = values[index];
        // Cast numerical fields
        if (
          [
            'Tenure',
            'CityTier',
            'WarehouseToHome',
            'HourSpendOnApp',
            'NumberOfDeviceRegistered',
            'SatisfactionScore',
            'NumberOfAddress',
            'Complain',
            'OrderAmountHikeFromlastYear',
            'CouponUsed',
            'OrderCount',
            'DaySinceLastOrder',
            'CashbackAmount',
            'CustomerID',
          ].includes(header)
        ) {
          row[header] = val !== undefined && val !== '' ? Number(val) : 0;
        } else {
          row[header] = val;
        }
      });
      rows.push(row);
    }
    return rows;
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    setFile(selected);
    setError(null);
  };

  const handleProcessFile = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsedRows = parseCSV(text);

        if (parsedRows.length === 0) {
          throw new Error('No customer records parsed from the CSV.');
        }

        const res = await api.predictBatch(parsedRows);
        setBatchResults(res.data);
      } catch (err) {
        setError(err.message || 'Failed to process batch CSV.');
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error reading file.');
      setLoading(false);
    };

    reader.readAsText(file);
  };

  // Generate Sample Demo CSV for immediate testing
  const handleDownloadSampleTemplate = () => {
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
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_churn_batch_test.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Results to CSV
  const handleExportResults = () => {
    if (!batchResults || !batchResults.predictions) return;

    const headers = [
      'CustomerID',
      'ChurnPrediction',
      'PredictionLabel',
      'ChurnProbability',
      'RiskLevel',
      'ComplaintImpact',
      'DistanceRisk',
      'EngagementScore',
    ];

    const rows = batchResults.predictions.map((p) => [
      p.customer_id || '',
      p.churn_prediction,
      p.prediction_label,
      p.churn_probability,
      p.risk_level,
      p.engineered_features?.Complaint_Impact || '',
      p.engineered_features?.Distance_Risk || '',
      p.engineered_features?.Engagement_Score || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `churn_predictions_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered table rows
  const filteredPredictions = (batchResults?.predictions || []).filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      String(item.customer_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.prediction_label.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk =
      filterRisk === 'ALL' ||
      item.risk_level.toLowerCase().includes(filterRisk.toLowerCase());

    return matchesSearch && matchesRisk;
  });

  return (
    <div className="space-y-6">
      {/* Upload & Actions Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Batch Customer Churn Evaluation
            </h3>
            <p className="text-xs text-slate-500">
              Upload customer profiles in CSV format to evaluate retention and churn risks in bulk.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadSampleTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg hover:bg-cyan-100 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download Sample Test CSV
          </button>
        </div>

        {error && (
          <StatusBanner
            type="warning"
            title="Batch Processing Notice"
            message={error}
          />
        )}

        {/* Dropzone Container */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-xl p-8 text-center cursor-pointer transition bg-slate-50/60 hover:bg-cyan-50/20"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <UploadCloud className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            {file ? file.name : 'Click to choose a CSV file, or drag and drop here'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Expected headers: Tenure, CityTier, WarehouseToHome, HourSpendOnApp, PreferredPaymentMode, etc.
          </p>
        </div>

        {file && (
          <div className="mt-4 flex items-center justify-between p-3 rounded-lg bg-slate-100 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-800">
              <FileText className="w-4 h-4 text-cyan-600" />
              <span>{file.name}</span>
              <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>

            <button
              onClick={handleProcessFile}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Processing...
                </>
              ) : (
                'Run Batch Predictions'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Batch Results Section */}
      {batchResults && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Total Scored Records</span>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {batchResults.total_records}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
              <span className="text-xs font-medium text-rose-700">Predicted Churners</span>
              <div className="text-2xl font-bold text-rose-700 mt-1">
                {batchResults.churned_count}
                <span className="text-xs font-normal text-rose-600 ml-2">
                  ({((batchResults.churned_count / batchResults.total_records) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-medium text-emerald-700">Predicted Retained</span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {batchResults.retained_count}
                <span className="text-xs font-normal text-emerald-600 ml-2">
                  ({((batchResults.retained_count / batchResults.total_records) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Table Controls (Search, Filter, Export) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by Customer ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>

              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High Risk Only</option>
                <option value="MEDIUM">Medium Risk Only</option>
                <option value="LOW">Low Risk Only</option>
              </select>
            </div>

            <button
              onClick={handleExportResults}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Predictions CSV
            </button>
          </div>

          {/* Predictions Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Customer ID</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4">Risk Level</th>
                    <th className="py-3 px-4">Churn Probability</th>
                    <th className="py-3 px-4">Complaint Impact</th>
                    <th className="py-3 px-4">Distance Risk</th>
                    <th className="py-3 px-4">Engagement Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPredictions.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {row.customer_id || `Rec-#${idx + 1}`}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            row.churn_prediction === 1 ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {row.prediction_label} (Class {row.churn_prediction})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <RiskBadge level={row.risk_level} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        {(row.churn_probability * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.engineered_features?.Complaint_Impact ?? '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.engineered_features?.Distance_Risk === 1 ? 'Yes (1.0)' : 'No (0.0)'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.engineered_features?.Engagement_Score ?? '—'}
                      </td>
                    </tr>
                  ))}

                  {filteredPredictions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No customer records matched your search/filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchPrediction;
