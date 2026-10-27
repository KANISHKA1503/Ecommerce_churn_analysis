import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle,
  Cpu,
  Layers,
  ShieldCheck,
  FileCode,
  Sliders,
  HelpCircle,
  Database,
  ExternalLink,
} from 'lucide-react';

import api from '../api/apiClient';
import MetricCard from '../components/MetricCard';
import StatusBanner from '../components/StatusBanner';
import LoadingSpinner from '../components/LoadingSpinner';

export const ModelPerformance = () => {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getModelInfo();
        setModelInfo(res.data);
      } catch (err) {
        setError(err.message || 'Failed to fetch model specifications.');
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Fetching model metadata and pipeline specs..." size="lg" />;
  }

  const metrics = modelInfo?.evaluation_metrics || {
    accuracy: 0.98579,
    precision: 0.96774,
    recall: 0.94737,
    f1_score: 0.95745,
    roc_auc: 0.99715,
  };

  const shapes = modelInfo?.dataset_shapes || {
    original_dataset: [5630, 20],
    training_set: [4504, 21],
    test_set: [1126, 21],
  };

  return (
    <div className="space-y-6">
      {error && (
        <StatusBanner
          type="warning"
          title="Metadata Connection Issue"
          message={error}
        />
      )}

      {/* Benchmark Disclaimer Banner */}
      <StatusBanner
        type="info"
        title="Recorded Test-Set Evaluation Benchmark Notice"
        message="The performance indicators below are historical test-set metrics evaluated on 1,126 unseen holdout records during model training in Google Colab (Python 3.10/3.13, Scikit-Learn 1.6.1, XGBoost 3.4.1, Imbalanced-Learn 0.14.2). They represent laboratory model capability rather than live production drift."
      />

      {/* 5 Primary Evaluation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Accuracy"
          value={`${((metrics.accuracy || 0.9858) * 100).toFixed(2)}%`}
          subtitle="Overall Correct Predictions"
          icon={Award}
          accentColor="teal"
          badgeText="98.58%"
          badgeVariant="success"
        />

        <MetricCard
          title="Precision"
          value={`${((metrics.precision || 0.9677) * 100).toFixed(2)}%`}
          subtitle="Positive Churn Precision"
          icon={CheckCircle}
          accentColor="blue"
          badgeText="96.77%"
          badgeVariant="success"
        />

        <MetricCard
          title="Recall (Sensitivity)"
          value={`${((metrics.recall || 0.9474) * 100).toFixed(2)}%`}
          subtitle="Identified Actual Churners"
          icon={ShieldCheck}
          accentColor="emerald"
          badgeText="94.74%"
          badgeVariant="success"
        />

        <MetricCard
          title="F1-Score"
          value={`${((metrics.f1_score || 0.9574) * 100).toFixed(2)}%`}
          subtitle="Harmonic Mean (P & R)"
          icon={Cpu}
          accentColor="purple"
          badgeText="95.74%"
          badgeVariant="success"
        />

        <MetricCard
          title="ROC-AUC Score"
          value={((metrics.roc_auc || 0.9972) * 100).toFixed(2)}
          subtitle="Area Under ROC Curve"
          icon={Layers}
          accentColor="rose"
          badgeText="0.9972"
          badgeVariant="success"
        />
      </div>

      {/* Model Architecture & Training Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Architecture */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Pipeline Architecture & Step Execution
              </h3>
              <p className="text-xs text-slate-500">
                Serialized `imblearn.pipeline.Pipeline` components
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 font-semibold border border-cyan-200">
              3-Stage Pipeline
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Feature Preprocessor: `ColumnTransformer`
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Numerical Pipeline: `SimpleImputer(median)` &rarr; `StandardScaler()` (16 features).
                  <br />
                  Categorical Pipeline: `SimpleImputer(most_frequent)` &rarr; `OneHotEncoder(handle_unknown='ignore')` (5 features).
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Resampling Step: `SMOTE(random_state=42)`
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Synthetic Minority Over-sampling Technique applied during training to counter severe class imbalance (83.2% vs 16.8%). Transparently bypassed during inference.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  Gradient Booster: `XGBClassifier`
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Gradient boosted decision trees trained with logloss objective, tree pruning, and regularized weights.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dataset Training Specifications */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                Dataset Partitioning & Shapes
              </h3>
              <p className="text-xs text-slate-500">
                Data partition sizes recorded in `model_metadata.json`
              </p>
            </div>
            <Database className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block">Total Records</span>
              <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                {shapes.original_dataset ? shapes.original_dataset[0].toLocaleString() : '5,630'}
              </span>
              <span className="text-[10px] text-slate-400">20 raw features</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block">Training Partition</span>
              <span className="text-lg font-bold text-cyan-700 mt-0.5 block">
                {shapes.training_set ? shapes.training_set[0].toLocaleString() : '4,504'}
              </span>
              <span className="text-[10px] text-slate-400">80% Split (SMOTE)</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <span className="text-[11px] text-slate-500 block">Holdout Test Set</span>
              <span className="text-lg font-bold text-blue-700 mt-0.5 block">
                {shapes.test_set ? shapes.test_set[0].toLocaleString() : '1,126'}
              </span>
              <span className="text-[10px] text-slate-400">20% Split (Final eval)</span>
            </div>
          </div>

          {/* Engineered Features Statistics */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
            <h4 className="font-semibold text-slate-800 mb-2">
              Feature Schema Statistics (Used in Inference Engineering)
            </h4>
            <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
              <div>Warehouse 75th Percentile: <strong className="text-slate-900 font-mono">20.0 km</strong></div>
              <div>Tenure Max Normalizer: <strong className="text-slate-900 font-mono">61.0 mo</strong></div>
              <div>Hour Spend Max: <strong className="text-slate-900 font-mono">5.0 hrs</strong></div>
              <div>Day Since Last Max: <strong className="text-slate-900 font-mono">46.0 days</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelPerformance;
