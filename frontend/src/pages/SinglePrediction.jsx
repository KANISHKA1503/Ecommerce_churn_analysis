import React, { useState } from 'react';
import {
  UserCheck,
  Send,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ShieldAlert,
  Sliders,
  ChevronRight,
} from 'lucide-react';

import api from '../api/apiClient';
import RiskBadge from '../components/RiskBadge';
import StatusBanner from '../components/StatusBanner';

const INITIAL_FORM = {
  CustomerID: '',
  Tenure: '',
  CityTier: 1,
  WarehouseToHome: '',
  HourSpendOnApp: '',
  NumberOfDeviceRegistered: '',
  SatisfactionScore: 3,
  NumberOfAddress: '',
  Complain: 0,
  OrderAmountHikeFromlastYear: '',
  CouponUsed: '',
  OrderCount: '',
  DaySinceLastOrder: '',
  CashbackAmount: '',
  PreferredLoginDevice: 'Mobile Phone',
  PreferredPaymentMode: 'Debit Card',
  Gender: 'Female',
  PreferedOrderCat: 'Laptop & Accessory',
  MaritalStatus: 'Married',
};

const PRESET_LOW_RISK = {
  CustomerID: 58102,
  Tenure: 24.0,
  CityTier: 1,
  WarehouseToHome: 8.0,
  HourSpendOnApp: 4.0,
  NumberOfDeviceRegistered: 3,
  SatisfactionScore: 5,
  NumberOfAddress: 2,
  Complain: 0,
  OrderAmountHikeFromlastYear: 18.0,
  CouponUsed: 3.0,
  OrderCount: 6.0,
  DaySinceLastOrder: 2.0,
  CashbackAmount: 220.0,
  PreferredLoginDevice: 'Mobile Phone',
  PreferredPaymentMode: 'Credit Card',
  Gender: 'Female',
  PreferedOrderCat: 'Grocery',
  MaritalStatus: 'Married',
};

const PRESET_HIGH_RISK = {
  CustomerID: 59304,
  Tenure: 0.0,
  CityTier: 3,
  WarehouseToHome: 32.0,
  HourSpendOnApp: 2.0,
  NumberOfDeviceRegistered: 5,
  SatisfactionScore: 1,
  NumberOfAddress: 7,
  Complain: 1,
  OrderAmountHikeFromlastYear: 11.0,
  CouponUsed: 0.0,
  OrderCount: 1.0,
  DaySinceLastOrder: 35.0,
  CashbackAmount: 105.0,
  PreferredLoginDevice: 'Computer',
  PreferredPaymentMode: 'COD',
  Gender: 'Male',
  PreferedOrderCat: 'Mobile Phone',
  MaritalStatus: 'Single',
};

export const SinglePrediction = () => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setResult(null);
    setError(null);
  };

  const handleLoadPreset = (preset) => {
    setFormData(preset);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    // Validate required fields
    const requiredFields = [
      { key: 'Tenure', label: 'Tenure' },
      { key: 'WarehouseToHome', label: 'Warehouse To Home distance' },
      { key: 'HourSpendOnApp', label: 'Daily Hours on App' },
      { key: 'NumberOfDeviceRegistered', label: 'Devices Registered' },
      { key: 'NumberOfAddress', label: 'Saved Addresses' },
      { key: 'OrderAmountHikeFromlastYear', label: 'Order Hike %' },
      { key: 'CouponUsed', label: 'Coupons Used' },
      { key: 'OrderCount', label: 'Total Order Count' },
      { key: 'DaySinceLastOrder', label: 'Days Since Last Order' },
      { key: 'CashbackAmount', label: 'Cashback Amount' },
    ];

    for (const field of requiredFields) {
      if (formData[field.key] === '' || formData[field.key] === undefined || isNaN(Number(formData[field.key]))) {
        setError(`Please enter a valid numeric value for ${field.label}.`);
        setLoading(false);
        return;
      }
    }

    try {
      // Prepare payload with types
      const payload = {
        CustomerID: formData.CustomerID ? Number(formData.CustomerID) : undefined,
        Tenure: Number(formData.Tenure),
        CityTier: parseInt(formData.CityTier, 10),
        WarehouseToHome: Number(formData.WarehouseToHome),
        HourSpendOnApp: Number(formData.HourSpendOnApp),
        NumberOfDeviceRegistered: parseInt(formData.NumberOfDeviceRegistered, 10),
        SatisfactionScore: parseInt(formData.SatisfactionScore, 10),
        NumberOfAddress: parseInt(formData.NumberOfAddress, 10),
        Complain: parseInt(formData.Complain, 10),
        OrderAmountHikeFromlastYear: Number(formData.OrderAmountHikeFromlastYear),
        CouponUsed: Number(formData.CouponUsed),
        OrderCount: Number(formData.OrderCount),
        DaySinceLastOrder: Number(formData.DaySinceLastOrder),
        CashbackAmount: Number(formData.CashbackAmount),
        PreferredLoginDevice: formData.PreferredLoginDevice,
        PreferredPaymentMode: formData.PreferredPaymentMode,
        Gender: formData.Gender,
        PreferedOrderCat: formData.PreferedOrderCat,
        MaritalStatus: formData.MaritalStatus,
      };

      const res = await api.predictSingle(payload);
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Failed to generate churn prediction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Preset Loader */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">
            Customer Profile Scoring
          </h3>
          <p className="text-xs text-slate-500">
            Enter customer parameters to evaluate retention probability and churn risk in real-time.
          </p>
        </div>

        {/* Quick Test Profiles */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Sample Profiles:</span>
          <button
            type="button"
            onClick={() => handleLoadPreset(PRESET_LOW_RISK)}
            className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition"
          >
            Low Risk Sample
          </button>
          <button
            type="button"
            onClick={() => handleLoadPreset(PRESET_HIGH_RISK)}
            className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-medium transition"
          >
            High Risk Sample
          </button>
        </div>
      </div>

      {error && (
        <StatusBanner
          type="warning"
          title="Inference Error"
          message={error}
        />
      )}

      {/* Main Grid: Form on Left, Live Score Result on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Container (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Customer Engagement & Tenure */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Sliders className="w-3.5 h-3.5 text-cyan-600" />
                <span>Account & Engagement Metrics</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Customer ID <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    name="CustomerID"
                    value={formData.CustomerID}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                    placeholder="e.g. 54007"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tenure (Months) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="Tenure"
                    required
                    value={formData.Tenure}
                    onChange={handleChange}
                    placeholder="e.g. 12"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    City Tier (1, 2, or 3) *
                  </label>
                  <select
                    name="CityTier"
                    value={formData.CityTier}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
                  >
                    <option value={1}>Tier 1 (Metro)</option>
                    <option value={2}>Tier 2 (Urban)</option>
                    <option value={3}>Tier 3 (Suburban/Rural)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Warehouse To Home (km) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="WarehouseToHome"
                    required
                    value={formData.WarehouseToHome}
                    onChange={handleChange}
                    placeholder="e.g. 15.0"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Daily Hours on App *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="HourSpendOnApp"
                    required
                    value={formData.HourSpendOnApp}
                    onChange={handleChange}
                    placeholder="e.g. 3.0"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Devices Registered *
                  </label>
                  <input
                    type="number"
                    name="NumberOfDeviceRegistered"
                    required
                    min="1"
                    value={formData.NumberOfDeviceRegistered}
                    onChange={handleChange}
                    placeholder="e.g. 3"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Order Behavior & Support */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>Purchasing & Support History</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Satisfaction Score (1-5) *
                  </label>
                  <select
                    name="SatisfactionScore"
                    value={formData.SatisfactionScore}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
                  >
                    <option value={1}>1 - Highly Dissatisfied</option>
                    <option value={2}>2 - Dissatisfied</option>
                    <option value={3}>3 - Neutral</option>
                    <option value={4}>4 - Satisfied</option>
                    <option value={5}>5 - Highly Satisfied</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Complain Logged *
                  </label>
                  <select
                    name="Complain"
                    value={formData.Complain}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
                  >
                    <option value={0}>0 - No Complaints</option>
                    <option value={1}>1 - Complaint Logged</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Addresses Saved *
                  </label>
                  <input
                    type="number"
                    name="NumberOfAddress"
                    required
                    min="1"
                    value={formData.NumberOfAddress}
                    onChange={handleChange}
                    placeholder="e.g. 2"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Order Hike (% from last yr) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="OrderAmountHikeFromlastYear"
                    required
                    value={formData.OrderAmountHikeFromlastYear}
                    onChange={handleChange}
                    placeholder="e.g. 14.0"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Coupons Used *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="CouponUsed"
                    required
                    min="0"
                    value={formData.CouponUsed}
                    onChange={handleChange}
                    placeholder="e.g. 1.0"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Total Order Count *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="OrderCount"
                    required
                    min="0"
                    value={formData.OrderCount}
                    onChange={handleChange}
                    placeholder="e.g. 2.0"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Days Since Last Order *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="DaySinceLastOrder"
                    required
                    min="0"
                    value={formData.DaySinceLastOrder}
                    onChange={handleChange}
                    placeholder="e.g. 3.0"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Cashback Amount ($) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="CashbackAmount"
                    required
                    min="0"
                    value={formData.CashbackAmount}
                    onChange={handleChange}
                    placeholder="e.g. 160.0"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Categorical & Demographic Preferences */}
            <div>
              <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Sliders className="w-3.5 h-3.5 text-teal-600" />
                <span>Demographics & Platform Preferences</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Login Device *
                  </label>
                  <select
                    name="PreferredLoginDevice"
                    value={formData.PreferredLoginDevice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
                  >
                    <option value="Mobile Phone">Mobile Phone</option>
                    <option value="Phone">Phone</option>
                    <option value="Computer">Computer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    name="PreferredPaymentMode"
                    value={formData.PreferredPaymentMode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
                  >
                    <option value="Debit Card">Debit Card</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="E wallet">E wallet</option>
                    <option value="UPI">UPI</option>
                    <option value="COD">COD</option>
                    <option value="CC">CC</option>
                    <option value="Cash on Delivery">Cash on Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Gender *
                  </label>
                  <select
                    name="Gender"
                    value={formData.Gender}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preferred Order Category *
                  </label>
                  <select
                    name="PreferedOrderCat"
                    value={formData.PreferedOrderCat}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
                  >
                    <option value="Laptop & Accessory">Laptop & Accessory</option>
                    <option value="Mobile Phone">Mobile Phone</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Grocery">Grocery</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Marital Status *
                  </label>
                  <select
                    name="MaritalStatus"
                    value={formData.MaritalStatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 bg-white"
                  >
                    <option value="Married">Married</option>
                    <option value="Single">Single</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Reset Fields
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {loading ? 'Evaluating Model...' : 'Calculate Churn Risk'}
              </button>
            </div>
          </form>
        </div>

        {/* Prediction Results Container (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900 text-sm mb-1">
              Retention Risk Assessment
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time churn risk classification and retention forecast
            </p>

            {result ? (
              <div className="space-y-5">
                {/* Result Hero Header */}
                <div
                  className={`p-5 rounded-xl border text-center transition-all ${
                    result.churn_prediction === 1
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-emerald-50/70 border-emerald-200'
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    <RiskBadge level={result.risk_level} size="lg" />
                  </div>

                  <div className="text-2xl font-bold tracking-tight text-slate-900 mt-2">
                    {result.prediction_label} (Class {result.churn_prediction})
                  </div>

                  <p className="text-xs text-slate-600 mt-1">
                    {result.churn_prediction === 1
                      ? 'Customer exhibits elevated behavioral churn indicators.'
                      : 'Customer demonstrates positive ongoing loyalty and engagement.'}
                  </p>
                </div>

                {/* Churn Probability Gauge Bar */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-semibold text-slate-700">Churn Probability</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {(result.churn_probability * 100).toFixed(2)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-500 ${
                        result.churn_probability >= 0.65
                          ? 'bg-rose-500'
                          : result.churn_probability >= 0.35
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(result.churn_probability * 100, 2)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
                    <span>Low Risk (&lt;35%)</span>
                    <span>Medium (35-65%)</span>
                    <span>High Risk (&ge;65%)</span>
                  </div>
                </div>

                {/* Engineered Features Breakdown */}
                {result.engineered_features && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <h4 className="font-semibold text-slate-700 mb-2.5 flex items-center justify-between">
                      <span>Engineered Features (Pipeline Calculated)</span>
                      <span className="text-[10px] text-cyan-600 font-medium">Exact Formula</span>
                    </h4>

                    <div className="space-y-2 text-slate-600">
                      <div className="flex items-center justify-between">
                        <span>Complaint Impact (Complain &times; Satisfaction):</span>
                        <strong className="text-slate-900">{result.engineered_features.Complaint_Impact}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Distance Risk (&gt; 20 km):</span>
                        <strong className="text-slate-900">{result.engineered_features.Distance_Risk === 1 ? 'High (1.0)' : 'Normal (0.0)'}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Engagement Composite Score:</span>
                        <strong className="text-slate-900">{result.engineered_features.Engagement_Score}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 text-slate-400">
                <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">No Prediction Generated Yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Adjust customer parameters on the left and click "Calculate Churn Risk" to evaluate.
                </p>
              </div>
            )}
          </div>

          {/* Decision Support Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>Decision Support Disclaimer</span>
            </div>
            This prediction is generated based on historical customer retention patterns and serves as decision support for customer success and retention teams.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SinglePrediction;
