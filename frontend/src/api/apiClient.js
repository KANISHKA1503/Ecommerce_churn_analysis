import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 3 minutes for large dataset processing
});

// Response interceptor for clear error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred.';
    if (error.response) {
      // Backend returned an error response
      message = error.response.data?.detail || error.response.data?.message || `Server error (${error.response.status})`;
    } else if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      message = 'Dataset processing timed out. For very large datasets, processing is running in the background.';
    } else if (error.request) {
      // No response received from server
      message = 'Could not connect to FastAPI backend at http://127.0.0.1:8000. Please ensure the backend server is running.';
    } else {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

// API Service Methods
export const api = {
  // General / Health
  getRoot: () => apiClient.get('/'),
  getHealth: () => apiClient.get('/health'),
  getModelInfo: () => apiClient.get('/model-info'),

  // Inference
  predictSingle: (customerData) => apiClient.post('/predict', customerData),
  predictBatch: (customersList) => apiClient.post('/predict/batch', { customers: customersList }),
  predictBatchCsv: (formData) =>
    apiClient.post('/predict/batch-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Analytics
  getAnalyticsOverview: () => apiClient.get('/analytics/overview'),
  getChurnDistribution: () => apiClient.get('/analytics/churn-distribution'),
  getFeatureImportance: () => apiClient.get('/analytics/feature-importance'),
  getSegments: () => apiClient.get('/analytics/segments'),
  uploadDatasetJson: (records, datasetName) =>
    apiClient.post('/analytics/upload-dataset', { dataset_name: datasetName, customers: records }),
  uploadDatasetCsv: (formData) =>
    apiClient.post('/analytics/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  resetDataset: () => apiClient.post('/analytics/reset-dataset'),
  loadBaseline: () => apiClient.post('/analytics/load-baseline'),
  downloadScoredCsvUrl: `${API_BASE_URL}/analytics/export-scored-csv`,
  downloadScoredCsv: () =>
    apiClient.get('/analytics/export-scored-csv', { responseType: 'blob' }),
};

export default api;
