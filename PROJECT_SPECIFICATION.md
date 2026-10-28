# E-Commerce Churn & Behaviour Analytics Platform
## Complete Technical Specification, Architecture & Implementation Guide

---

## 1. Executive Summary & Business Problem

### 1.1 Project Title
**E-Commerce Churn & Behaviour Analytics Platform**

### 1.2 Purpose & Problem Statement
Customer acquisition in modern e-commerce costs 5–7× more than retaining existing customers. This platform provides an end-to-end, production-ready machine learning and analytics system that predicts customer churn before it occurs.

The system combines:
1. An **XGBoost machine learning pipeline** trained on historical behavioral and transaction records with high predictive accuracy (F1-score: **95.74%**, ROC-AUC: **99.72%**).
2. A high-performance **FastAPI backend** providing real-time single scoring, batch CSV predictions, and aggregated cohort analytics.
3. A modern **React 19 + Tailwind CSS** executive analytics interface tailored for customer success and retention teams.

### 1.3 Key Features
- **Real-Time Customer Scoring**: Instant churn probability calculation with dynamic risk categorization (`Low`, `Medium`, `High`) and personalized retention recommendations.
- **Batch Dataset Evaluation**: Drag-and-drop CSV upload for thousands of customer accounts with live progress indicators and one-click export of scored records.
- **Executive Analytics Dashboard**: Real-time KPI metrics (Total Accounts, Retained, Churned, Churn Rate, Retention Rate), Churn Donut distribution, and Top Churn Risk Drivers.
- **Behavioral Customer Segmentation**: Tenure cohort tracking (0–6m, 7–12m, 13–24m, 24m+) and category-level risk breakdowns (Fashion, Electronics, Mobile, Grocery).

---

## 2. Technology Stack & Runtime Specifications

### 2.1 Backend Architecture
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Language** | Python | `3.10+` / `3.13` | Core backend runtime |
| **Framework** | FastAPI | Latest | Asynchronous REST API routing & validation |
| **ASGI Server** | Uvicorn | Standard | High-concurrency async web server |
| **Data Validation** | Pydantic v2 | Latest | Schema validation and serialization |
| **Machine Learning** | Scikit-Learn | `1.6.1` | Preprocessing transformers and pipelines |
| **Gradient Boosting**| XGBoost | `3.4.1` | Trained classifier estimator |
| **Pipeline Container**| Imbalanced-Learn | `0.14.2` | Pipeline wrapper (`imblearn.pipeline.Pipeline`) |
| **Model Serialization**| Joblib | `1.6.0` | Disk persistence and deserialization |
| **Data Processing** | Pandas & NumPy | Latest | Feature manipulation & cohort aggregation |

### 2.2 Frontend Architecture
| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | React | `19.2.8` | Declarative UI component tree |
| **Build Tool** | Vite | `8.3.0` | Fast HMR dev server and Rollup/Vite bundler |
| **Styling** | Tailwind CSS | `3.4.17` | Utility-first responsive styling system |
| **PostCSS** | Autoprefixer | `10.6.1` | Cross-browser CSS prefixes |
| **Icons** | Lucide React | `1.51.0` | Crisp SVG iconography |
| **Charts** | Recharts | `3.10.1` | Interactive SVG data visualizations (Pie, Bar) |
| **Visual Export** | html2canvas | `1.4.1` | High-resolution DOM-to-PNG chart image rasterization |
| **HTTP Client** | Axios | `1.20.0` | Promise-based REST client with interceptors |

---

## 3. Machine Learning Model & Pipeline Specification

### 3.1 Training Dataset Profiles
- **Dataset Name**: E-Commerce Churn Data (`churn_data.csv`)
- **Total Records**: `5,630` customer entries
- **Target Variable**: `Churn` (`0` = Retained, `1` = Churned)
- **Class Balance**: 
  - Retained: `4,682` (83.16%)
  - Churned: `948` (16.84%)
- **Data Splits**:
  - Training Set: `4,504` rows × `21` features (80%)
  - Holdout Test Set: `1,126` rows × `21` features (20%)

### 3.2 Evaluation Metrics (Evaluated on Unseen Holdout Set)
- **Accuracy**: `98.58%`
- **Precision**: `96.77%`
- **Recall**: `94.74%`
- **F1-Score**: `95.74%`
- **ROC-AUC**: `99.72%`

### 3.3 Full Feature Schema

#### Raw Features (16 Numerical + 5 Categorical)
| Feature Name | Type | Description | Allowed Values / Domain |
| :--- | :--- | :--- | :--- |
| `CustomerID` | Integer | Unique identifier | Optional metadata |
| `Tenure` | Float | Duration of account in months | `0.0` to `61.0+` |
| `CityTier` | Integer | Urban classification tier | `1`, `2`, `3` |
| `WarehouseToHome` | Float | Distance from warehouse in km | `5.0` to `127.0` |
| `HourSpendOnApp` | Float | Average daily hours spent on app | `0.0` to `5.0` |
| `NumberOfDeviceRegistered` | Integer | Registered devices per customer | `1` to `6+` |
| `SatisfactionScore` | Integer | Stated customer satisfaction | `1` (Dissatisfied) to `5` (Satisfied) |
| `NumberOfAddress` | Integer | Saved shipping addresses | `1` to `22` |
| `Complain` | Integer | Complaint lodged in last month | `0` (No), `1` (Yes) |
| `OrderAmountHikeFromlastYear` | Float | % increase in annual spend | `11.0` to `26.0` |
| `CouponUsed` | Float | Count of promotional coupons used | `0.0` to `16.0` |
| `OrderCount` | Float | Total order count placed | `1.0` to `16.0` |
| `DaySinceLastOrder` | Float | Inactivity recency in days | `0.0` to `46.0` |
| `CashbackAmount` | Float | Average monthly cashback ($) | `0.0` to `325.0` |
| `PreferredLoginDevice` | String | Main device used to browse | `Mobile Phone`, `Phone`, `Computer` |
| `PreferredPaymentMode` | String | Primary payment method | `Debit Card`, `Credit Card`, `E wallet`, `UPI`, `COD`, `CC`, `Cash on Delivery` |
| `Gender` | String | Customer gender | `Female`, `Male` |
| `PreferedOrderCat` | String | Most frequent order category | `Laptop & Accessory`, `Mobile Phone`, `Fashion`, `Grocery`, `Mobile`, `Others` |
| `MaritalStatus` | String | Customer marital status | `Married`, `Single`, `Divorced` |

#### Dynamically Engineered Features
Before passing inputs to the trained pipeline, the backend automatically calculates 3 mathematical features:
1. **`Complaint_Impact`**:
   $$\text{Complaint\_Impact} = \text{Complain} \times \text{SatisfactionScore}$$
   *Identifies high-dissatisfaction customers who actively lodged complaints.*
2. **`Distance_Risk`**:
   $$\text{Distance\_Risk} = \begin{cases} 1.0 & \text{if } \text{WarehouseToHome} > 20.0 \\ 0.0 & \text{otherwise} \end{cases}$$
   *Threshold based on the 75th percentile of warehouse delivery distance (20 km).*
3. **`Engagement_Score`**:
   $$\text{Engagement\_Score} = \left(\frac{\text{Tenure}}{61.0}\right) + \left(\frac{\text{HourSpendOnApp}}{5.0}\right) + \left(1.0 - \frac{\text{DaySinceLastOrder}}{46.0}\right)$$
   *Composite index combining normalized tenure, app usage, and reciprocal order recency.*

### 3.4 Preprocessing & Estimator Pipeline
The serialized pipeline in [`backend/model/churn_pipeline.joblib`](file:///c:/Users/Kanishka/Desktop/DS_Prjct/backend/model/churn_pipeline.joblib) contains:
1. **`preprocessor`** (`ColumnTransformer`):
   - **`num` Pipeline**: `SimpleImputer(strategy='median')` $\rightarrow$ `RobustScaler()` applied to 16 numerical features (including the 3 engineered features).
   - **`cat` Pipeline**: `SimpleImputer(strategy='most_frequent')` $\rightarrow$ `OneHotEncoder(handle_unknown='ignore')` applied to 5 categorical features.
2. **`classifier`** (`XGBClassifier`):
   - Gradient-boosted decision trees trained with objective `binary:logistic`.

---

## 4. Key Engineering Challenges & Solutions

### 4.1 Cross-Platform XGBoost Deserialization Patch
- **The Issue**: Loading `churn_pipeline.joblib` (trained in Linux Google Colab) on Windows XGBoost `3.4.1` crashed with:
  ```text
  XGBoostError: [timestamp] C:\...\src\learner.cc:996: input stream corrupted
  ```
  This is a known upstream XGBoost bug caused by Colab writing training-time random state (`rng_state`) buffers into the UBJSON stream that Windows C++ native binaries reject.
- **The Fix**:
  In [`backend/prediction_service.py`](file:///c:/Users/Kanishka/Desktop/DS_Prjct/backend/prediction_service.py), we implemented an in-memory binary parser (`_UBJsonReader`) and patched `Booster.__setstate__`. When deserializing, the parser extracts the raw UBJSON structure, strips the corrupted state tokens, and rebuilds the booster handle via native `ctypes` without modifying model weights or re-training.

### 4.2 Decoupled Service-Route Architecture
- Model inference, pipeline loading, and mathematical feature engineering are strictly isolated in [`prediction_service.py`](file:///c:/Users/Kanishka/Desktop/DS_Prjct/backend/prediction_service.py).
- Dataset cohort aggregations and statistical calculations are encapsulated in [`analytics_service.py`](file:///c:/Users/Kanishka/Desktop/DS_Prjct/backend/analytics_service.py).
- HTTP routing, request parsing, and error status mapping reside in [`main.py`](file:///c:/Users/Kanishka/Desktop/DS_Prjct/backend/main.py).

---

## 5. API Specification & Endpoints

All endpoints are hosted at `http://127.0.0.1:8000` with automated OpenAPI/Swagger documentation at `/docs`.

### 5.1 System & Health
- **`GET /`**:
  - Response: `{ "status": "online", "message": "E-Commerce Churn & Behaviour Analytics API", "version": "1.0.0" }`
- **`GET /health`**:
  - Checks if pipeline is loaded and dataset is connected.
  - Response:
    ```json
    {
      "status": "healthy",
      "model_loaded": true,
      "dataset_available": true,
      "uptime_seconds": 128.4
    }
    ```

### 5.2 Model Metadata
- **`GET /model-info`**:
  - Returns model architecture, train/test dataset shapes, and evaluation metrics.

### 5.3 Single Inference
- **`POST /predict`**:
  - Accepts raw customer profile JSON. Computes engineered features dynamically.
  - **Request Body Example**:
    ```json
    {
      "CustomerID": 54001,
      "Tenure": 12.0,
      "CityTier": 1,
      "WarehouseToHome": 15.0,
      "HourSpendOnApp": 3.0,
      "NumberOfDeviceRegistered": 3,
      "SatisfactionScore": 4,
      "NumberOfAddress": 2,
      "Complain": 0,
      "OrderAmountHikeFromlastYear": 14.0,
      "CouponUsed": 1.0,
      "OrderCount": 2.0,
      "DaySinceLastOrder": 3.0,
      "CashbackAmount": 160.0,
      "PreferredLoginDevice": "Mobile Phone",
      "PreferredPaymentMode": "Debit Card",
      "Gender": "Female",
      "PreferedOrderCat": "Laptop & Accessory",
      "MaritalStatus": "Married"
    }
    ```
  - **Response Payload**:
    ```json
    {
      "customer_id": 54001,
      "churn_prediction": 0,
      "churn_label": "Retained",
      "churn_probability": 0.0412,
      "retention_probability": 0.9588,
      "risk_category": "Low",
      "risk_factors": ["Low overall churn indicators"],
      "recommendations": ["Customer displays healthy loyalty. Maintain regular engagement."],
      "engineered_features": {
        "Complaint_Impact": 0.0,
        "Distance_Risk": 0.0,
        "Engagement_Score": 1.73
      }
    }
    ```

### 5.4 Batch Inference
- **`POST /predict/batch`**:
  - Accepts a `multipart/form-data` CSV file containing multiple customer rows.
  - Validates missing columns, parses records, applies batch vectorization, and returns:
    - Scored records list (`customer_id`, `churn_prediction`, `churn_probability`, `risk_category`).
    - Summary aggregates (`total_records`, `churn_count`, `retained_count`, `risk_breakdown`).

### 5.5 Analytics & Segmentation
- **`GET /analytics/overview`**: Total customers, retained count, churned count, churn rate %, active dataset status (`is_custom_dataset`, `dataset_name`), and model evaluation metrics.
- **`GET /analytics/churn-distribution`**: Categorical breakdown of churn rates grouped by `PreferedOrderCat`, `CityTier`, and `PreferredPaymentMode`.
- **`GET /analytics/feature-importance`**: Normalized feature importance extracted directly from the XGBoost booster.
- **`GET /analytics/segments`**: Cohort analysis across tenure brackets (`0-6m`, `7-12m`, `13-24m`, `24m+`).
- **`POST /analytics/upload-dataset`**: Activates uploaded JSON customer records across the platform, immediately recalculating all KPIs and cohorts.
- **`POST /analytics/upload-csv`**: Activates a multipart CSV file upload across all platform dashboards.
- **`POST /analytics/reset-dataset`**: Clears active dataset back to initial clean upload state.
- **`POST /analytics/load-baseline`**: Optionally loads the 5,630-record historical baseline for demonstration.
- **`GET /analytics/export-scored-csv`**: Downloads the complete scored CSV with original customer attributes and ML predictions.

---

## 6. Frontend Architecture & Page Details

The frontend is built as a single-page SaaS dashboard with a unified dark navy sidebar and clean workspace layout.

```text
frontend/src/
├── api/
│   └── apiClient.js          # Centralized Axios client targeting http://127.0.0.1:8000
├── components/
│   ├── Header.jsx            # Top navbar: active page title, API health dot, active dataset pill
│   ├── Sidebar.jsx           # Dark navy sidebar (#0F172A) with Lucide navigation icons
│   ├── MetricCard.jsx        # Stat KPI card with color-coded accent badges
│   ├── RiskBadge.jsx         # Status pill for Low (green), Medium (amber), High (rose) risk
│   ├── StatusBanner.jsx      # Warning and error alert component
│   └── LoadingSpinner.jsx    # Smooth SVG loader with contextual status text
├── pages/
│   ├── OverviewDashboard.jsx # Initial welcome & upload workflow view; dynamic 5 KPIs, Donut & Bar charts once uploaded
│   ├── SinglePrediction.jsx  # Customer profile form, empty defaults, presets, live risk gauge
│   ├── BatchPrediction.jsx   # CSV upload zone, sample CSV download, results table, CSV export
│   └── CustomerSegmentation.jsx # Zero-safe tenure cohorts, category risk table, demographic matrices
├── App.jsx                   # Main layout container, active dataset state, top notification bar
├── index.css                 # Inter typography, Tailwind utilities
└── main.jsx                  # React DOM mount point
```

### 6.1 Page Breakdown
1. **Overview Dashboard**:
   - **Initial State**: Welcoming system overview, 3-step workflow diagram, embedded drag-and-drop CSV upload zone, and "Download Sample CSV" button.
   - **Active State (Once CSV uploaded)**: 5 KPI summary cards (Total Accounts, Retained, Churned, Churn Rate %, Retention Rate %), Churn Donut chart, Top Churn Risk Drivers, Category churn rates, Demographic rates, and a "Download Scored CSV" button.
2. **Customer Churn Prediction**:
   - Modular 3-section input form (Account & Engagement, Purchasing & Support, Demographics).
   - Starts with empty inputs and helpful placeholders (`placeholder="e.g. 12"`).
   - Optional quick sample profiles: **"Low Risk Sample"** and **"High Risk Sample"**.
   - Displays real-time churn probability gauge, risk classification, flagged risk factors, and recommended interventions.
3. **Batch Churn Prediction**:
   - Drag-and-drop CSV upload zone.
   - Built-in "Download Sample Test CSV" button.
   - Automatic platform-wide dataset activation upon scoring.
   - Searchable, paginated table of scored customers with color-coded probability badges.
   - "Download Scored CSV" button.
4. **Customer Segmentation**:
   - **Initial State**: Clean prompt inviting user to upload a customer CSV to generate cohorts.
   - **Active State**: Live tenure cohort progression (`0-6m`, `6-12m`, `1-2y`, `2-5y`, `5+y`), category risk breakdown table, and gender/marital segment matrices.
   - Direct "Download Scored CSV" button.

---

## 7. Directory Tree

```text
DS_Prjct/
├── PROJECT_SPECIFICATION.md          # Complete project specification and guide
├── backend/
│   ├── data/
│   │   └── churn_data.csv            # 5,630-record historical customer dataset
│   ├── model/
│   │   ├── churn_pipeline.joblib     # Pre-trained XGBoost pipeline (516 KB)
│   │   ├── feature_schema.json       # Feature names, types, and percentile statistics
│   │   └── model_metadata.json       # Train/test shapes and evaluation metrics
│   ├── analytics_service.py          # Data aggregation and cohort statistical service
│   ├── prediction_service.py         # XGBoost deserializer, feature engineering, inference
│   ├── main.py                       # FastAPI application, route handlers, Pydantic schemas
│   └── requirements.txt              # Python package dependencies
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── apiClient.js          # Axios API client
    │   ├── utils/
    │   │   └── exportVisuals.js      # html2canvas PNG export & printable PDF utility
    │   ├── components/               # Reusable UI component library
    │   │   ├── Header.jsx
    │   │   ├── LoadingSpinner.jsx
    │   │   ├── MetricCard.jsx
    │   │   ├── RiskBadge.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── StatusBanner.jsx
    │   ├── pages/                    # 4 Core Business Pages
    │   │   ├── BatchPrediction.jsx
    │   │   ├── CustomerSegmentation.jsx
    │   │   ├── OverviewDashboard.jsx
    │   │   └── SinglePrediction.jsx
    │   ├── App.jsx                   # Root application state & layout
    │   ├── index.css                 # Tailwind CSS styles
    │   └── main.jsx                  # Application entry point
    ├── package.json                  # React 19, Vite, Tailwind, Recharts dependencies
    ├── tailwind.config.js            # Tailwind theme tokens and palette
    └── vite.config.js                # Vite build configuration
```

---

## 8. How to Run the Project Locally

### 8.1 Backend Execution
```bash
# 1. Open terminal and navigate to backend
cd backend

# 2. Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# 3. Ensure dependencies are installed
pip install -r requirements.txt

# 4. Start the FastAPI Uvicorn server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
*API will be available at `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.*

### 8.2 Frontend Execution
```bash
# 1. Open a new terminal and navigate to frontend
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Launch Vite development server
npm run dev
```
*Frontend will be running at `http://localhost:5173/`.*

### 8.3 Production Build Verification
```bash
cd frontend
npm run build
```
*Generates optimized production bundle in `frontend/dist/` with 0 compilation errors.*
