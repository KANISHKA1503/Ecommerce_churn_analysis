import logging
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from analytics_service import AnalyticsService
from prediction_service import PredictionService

# Setup logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ecommerce_churn_api")

# Services lifecycle
prediction_service: Optional[PredictionService] = None
analytics_service: Optional[AnalyticsService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global prediction_service, analytics_service
    logger.info("Initializing Machine Learning and Analytics Services...")
    try:
        prediction_service = PredictionService()
        analytics_service = AnalyticsService(prediction_service=prediction_service)
        logger.info("Services initialized successfully.")
    except Exception as exc:
        logger.error(f"Critical error during startup service initialization: {exc}")
        raise exc
    yield
    logger.info("Shutting down application...")


# FastAPI application instance
app = FastAPI(
    title="E-Commerce Churn & Behaviour Analytics API",
    description=(
        "Production REST API for customer churn risk prediction and behavioral analytics, "
        "powered by an XGBoost pipeline (SMOTE + ColumnTransformer + XGBClassifier) trained on 5,630 e-commerce customer profiles."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration for React Frontend
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class CustomerInput(BaseModel):
    CustomerID: Optional[int] = Field(None, description="Optional Customer Identifier", example=54007)
    Tenure: float = Field(..., description="Tenure in months", example=12.0)
    CityTier: int = Field(..., ge=1, le=3, description="City Tier category (1, 2, or 3)", example=1)
    WarehouseToHome: float = Field(..., ge=0.0, description="Distance from warehouse to home (km)", example=15.0)
    HourSpendOnApp: float = Field(..., ge=0.0, description="Hours spent on app daily", example=3.0)
    NumberOfDeviceRegistered: int = Field(..., ge=1, description="Number of registered devices", example=3)
    SatisfactionScore: int = Field(..., ge=1, le=5, description="Satisfaction score (1-5)", example=4)
    NumberOfAddress: int = Field(..., ge=1, description="Number of registered addresses", example=2)
    Complain: int = Field(..., ge=0, le=1, description="1 if customer logged complaint, 0 otherwise", example=0)
    OrderAmountHikeFromlastYear: float = Field(..., description="Percentage increase in order amount", example=14.0)
    CouponUsed: float = Field(..., ge=0.0, description="Number of coupons used", example=1.0)
    OrderCount: float = Field(..., ge=0.0, description="Order count in last period", example=2.0)
    DaySinceLastOrder: float = Field(..., ge=0.0, description="Days elapsed since last order", example=3.0)
    CashbackAmount: float = Field(..., ge=0.0, description="Average cashback amount received", example=160.0)
    PreferredLoginDevice: str = Field(..., description="Preferred login device ('Mobile Phone', 'Phone', 'Computer')", example="Mobile Phone")
    PreferredPaymentMode: str = Field(..., description="Preferred payment mode ('Debit Card', 'Credit Card', 'E wallet', 'UPI', 'COD', 'CC', 'Cash on Delivery')", example="Debit Card")
    Gender: str = Field(..., description="Gender ('Female', 'Male')", example="Female")
    PreferedOrderCat: str = Field(..., description="Preferred order category ('Laptop & Accessory', 'Mobile Phone', 'Fashion', 'Grocery', 'Mobile', 'Others')", example="Laptop & Accessory")
    MaritalStatus: str = Field(..., description="Marital status ('Single', 'Married', 'Divorced')", example="Married")


class BatchCustomerInput(BaseModel):
    customers: List[CustomerInput] = Field(..., min_length=1, description="List of customer records for batch scoring")


class EngineeredFeatures(BaseModel):
    Complaint_Impact: float
    Distance_Risk: float
    Engagement_Score: float


class PredictionResponse(BaseModel):
    customer_id: Optional[int] = None
    churn_prediction: int = Field(..., description="0 = Retained, 1 = Churned")
    churn_probability: float = Field(..., description="Predicted probability of churning [0.0 - 1.0]")
    risk_level: str = Field(..., description="'Low Risk', 'Medium Risk', or 'High Risk'")
    prediction_label: str = Field(..., description="'Retained' or 'Churned'")
    risk_score_percent: Optional[float] = Field(None, description="Risk score expressed as percentage (0-100%)")
    engineered_features: Optional[EngineeredFeatures] = None


class BatchPredictionResponse(BaseModel):
    total_records: int
    churned_count: int
    retained_count: int
    predictions: List[PredictionResponse]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    pipeline_ready: bool
    version: str


class ModelInfoResponse(BaseModel):
    model_name: str
    algorithm: str
    pipeline_steps: List[str]
    raw_numerical_features: List[str]
    raw_categorical_features: List[str]
    engineered_features: List[str]
    engineered_features_statistics: Dict[str, float]
    evaluation_metrics: Dict[str, float]
    dataset_shapes: Dict[str, Any]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", summary="Root Health Check", tags=["General"])
async def root():
    """Simple ping endpoint confirming API availability."""
    return {
        "status": "online",
        "service": "E-Commerce Churn & Behaviour Analytics API",
        "version": "1.0.0",
        "documentation": "/docs",
    }


@app.get("/health", response_model=HealthResponse, summary="Application & Model Health Readiness", tags=["General"])
async def health():
    """Verify application readiness, dependency states, and model pipeline availability."""
    is_ready = prediction_service is not None and prediction_service.pipeline is not None
    return HealthResponse(
        status="healthy" if is_ready else "degraded",
        model_loaded=is_ready,
        pipeline_ready=is_ready,
        version="1.0.0",
    )


@app.get("/model-info", response_model=ModelInfoResponse, summary="Model Metadata & Specifications", tags=["Model"])
async def get_model_info():
    """Return model architecture, feature expectations, statistical parameters, and recorded test metrics."""
    if not prediction_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction service is not initialized."
        )

    pipeline_steps = [name for name, _ in prediction_service.pipeline.steps] if hasattr(prediction_service.pipeline, "steps") else []
    metrics = (
        prediction_service.metadata.get("models", {})
        .get("xgboost_challenger", {})
        .get("metrics_on_test", {})
    )
    shapes = prediction_service.metadata.get("dataset_shapes", {})

    return ModelInfoResponse(
        model_name="XGBoost Challenger Churn Predictor",
        algorithm="XGBClassifier (with SMOTE and ColumnTransformer)",
        pipeline_steps=pipeline_steps,
        raw_numerical_features=prediction_service.RAW_NUMERICAL_FEATURES,
        raw_categorical_features=prediction_service.RAW_CATEGORICAL_FEATURES,
        engineered_features=prediction_service.ENGINEERED_FEATURES,
        engineered_features_statistics=prediction_service.engineered_stats,
        evaluation_metrics=metrics,
        dataset_shapes=shapes,
    )


@app.post("/predict", response_model=PredictionResponse, summary="Predict Churn for Single Customer", tags=["Inference"])
async def predict_single(customer: CustomerInput):
    """
    Score churn risk and generate predictions for an individual customer.
    Validates all inputs, performs feature engineering, and returns risk categorization.
    """
    if not prediction_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction service is not initialized."
        )

    try:
        data = customer.model_dump()
        result = prediction_service.predict(data)
        return PredictionResponse(**result)
    except ValueError as ve:
        logger.warning(f"Validation error in predict: {ve}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Inference error in predict: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference processing error: {exc}"
        )


@app.post("/predict/batch", response_model=BatchPredictionResponse, summary="Predict Churn for Multiple Customers", tags=["Inference"])
async def predict_batch(batch: BatchCustomerInput):
    """
    Score churn risk for multiple customer profiles in batch.
    Processes all items through the exact same feature engineering and validation pipeline.
    """
    if not prediction_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction service is not initialized."
        )

    try:
        customers_data = [c.model_dump() for c in batch.customers]
        results = prediction_service.predict_batch(customers_data)

        churned_count = sum(1 for r in results if r["churn_prediction"] == 1)
        retained_count = len(results) - churned_count

        return BatchPredictionResponse(
            total_records=len(results),
            churned_count=churned_count,
            retained_count=retained_count,
            predictions=[PredictionResponse(**r) for r in results],
        )
    except ValueError as ve:
        logger.warning(f"Validation error in batch predict: {ve}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error(f"Inference error in batch predict: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch inference processing error: {exc}"
        )


@app.get("/analytics/overview", summary="Dashboard KPI Overview", tags=["Analytics"])
async def analytics_overview():
    """
    Return high-level summary statistics including customer totals, churn rates,
    and model test evaluation benchmarks.
    """
    if not analytics_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not initialized."
        )
    return analytics_service.get_overview()


@app.get("/analytics/churn-distribution", summary="Churn Distribution by Segments", tags=["Analytics"])
async def analytics_churn_distribution():
    """
    Return churn distribution across gender, order categories, payment methods,
    and login devices.
    """
    if not analytics_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not initialized."
        )
    return analytics_service.get_churn_distribution()


@app.get("/analytics/feature-importance", summary="Model Feature Importance", tags=["Analytics"])
async def analytics_feature_importance():
    """
    Return feature importances extracted directly from the trained XGBoost model.
    """
    if not analytics_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not initialized."
        )
    return analytics_service.get_feature_importance()


@app.get("/analytics/segments", summary="Customer Segment Analytics", tags=["Analytics"])
async def analytics_segments():
    """
    Return multi-dimensional customer segmentation analytics across demographics and tenure.
    """
    if not analytics_service:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Analytics service is not initialized."
        )
    return analytics_service.get_segments()
