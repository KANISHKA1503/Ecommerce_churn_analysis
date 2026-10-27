import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from prediction_service import PredictionService

logger = logging.getLogger("analytics_service")


class AnalyticsService:
    """
    Analytics service providing dataset overview, churn distributions,
    tenure analysis, customer segmentation, and model feature importance.
    Supports dynamic CSV dataset loading via DATASET_PATH environment variable
    or fallback to model metadata when raw dataset is not provided.
    """

    def __init__(
        self,
        prediction_service: Optional[PredictionService] = None,
        dataset_path: Optional[str] = None,
    ):
        self.prediction_service = prediction_service or PredictionService()
        self.backend_dir = Path(__file__).resolve().parent
        self.metadata_path = self.backend_dir / "model" / "model_metadata.json"
        self.schema_path = self.backend_dir / "model" / "feature_schema.json"

        # Determine dataset path from parameter, env variable, or default data directory
        env_path = os.getenv("DATASET_PATH")
        if dataset_path:
            self.dataset_path = Path(dataset_path)
        elif env_path:
            self.dataset_path = Path(env_path)
        else:
            self.dataset_path = self.backend_dir / "data" / "churn_data.csv"

        self.df: Optional[pd.DataFrame] = None
        self.metadata: Dict[str, Any] = {}
        self.schema: Dict[str, Any] = {}

        self._load_metadata()
        self._load_dataset_if_available()

    def _load_metadata(self) -> None:
        """Load recorded dataset shapes and evaluation metrics from model_metadata.json."""
        if self.metadata_path.exists():
            try:
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load metadata from {self.metadata_path}: {e}")

        if self.schema_path.exists():
            try:
                with open(self.schema_path, "r", encoding="utf-8") as f:
                    self.schema = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load schema from {self.schema_path}: {e}")

    def _load_dataset_if_available(self) -> None:
        """Attempt to load the CSV dataset if it exists at the configured path."""
        if self.dataset_path and self.dataset_path.exists():
            try:
                self.df = pd.read_csv(self.dataset_path)
                logger.info(f"Loaded dataset with {len(self.df)} records from {self.dataset_path}")
            except Exception as e:
                logger.error(f"Failed to read dataset at {self.dataset_path}: {e}")
                self.df = None
        else:
            self.df = None

    def is_dataset_available(self) -> bool:
        """Check if raw CSV dataset is loaded and available."""
        return self.df is not None and not self.df.empty

    def get_overview(self) -> Dict[str, Any]:
        """
        Return high-level summary KPI metrics.
        If dataset is loaded, computes live counts.
        If missing, returns recorded metadata metrics with a clear status message.
        """
        if self.is_dataset_available() and "Churn" in self.df.columns:
            total = int(len(self.df))
            churned = int((self.df["Churn"] == 1).sum())
            retained = int((self.df["Churn"] == 0).sum())
            churn_rate = round((churned / total) * 100, 2) if total > 0 else 0.0

            return {
                "dataset_available": True,
                "dataset_path": str(self.dataset_path),
                "total_customers": total,
                "churned_customers": churned,
                "retained_customers": retained,
                "overall_churn_rate_percent": churn_rate,
                "model_recorded_metrics": self.metadata.get("models", {}).get("xgboost_challenger", {}).get("metrics_on_test", {}),
            }

        shapes = self.metadata.get("dataset_shapes", {})
        original_shape = shapes.get("original_dataset", [5630, 20])
        training_shape = shapes.get("training_set", [4504, 21])
        test_shape = shapes.get("test_set", [1126, 21])

        return {
            "dataset_available": False,
            "message": (
                f"Raw dataset CSV not found at '{self.dataset_path}'. "
                "Configure the DATASET_PATH environment variable to enable raw data calculations. "
                "Displaying training and test benchmark statistics from model metadata."
            ),
            "total_recorded_records": original_shape[0],
            "training_set_records": training_shape[0],
            "test_set_records": test_shape[0],
            "model_evaluation_metrics": self.metadata.get("models", {}).get("xgboost_challenger", {}).get("metrics_on_test", {
                "accuracy": 0.9858,
                "precision": 0.9677,
                "recall": 0.9474,
                "f1_score": 0.9574,
                "roc_auc": 0.9972
            }),
        }

    def get_churn_distribution(self) -> Dict[str, Any]:
        """
        Return churn distributions across key demographic and behavioral features.
        """
        if not self.is_dataset_available() or "Churn" not in self.df.columns:
            return {
                "dataset_available": False,
                "message": (
                    f"Dataset CSV not found at '{self.dataset_path}'. "
                    "Set DATASET_PATH environment variable pointing to the churn dataset CSV to view categorical distributions."
                ),
            }

        def _get_dist(col: str) -> List[Dict[str, Any]]:
            if col not in self.df.columns:
                return []
            grouped = self.df.groupby(col)["Churn"].agg(
                total_customers="count",
                churned_customers="sum"
            ).reset_index()
            grouped["retained_customers"] = grouped["total_customers"] - grouped["churned_customers"]
            grouped["churn_rate_percent"] = (
                (grouped["churned_customers"] / grouped["total_customers"]) * 100
            ).round(2)
            grouped.rename(columns={col: "category"}, inplace=True)
            return grouped.to_dict(orient="records")

        return {
            "dataset_available": True,
            "by_gender": _get_dist("Gender"),
            "by_preferred_order_category": _get_dist("PreferedOrderCat"),
            "by_marital_status": _get_dist("MaritalStatus"),
            "by_preferred_payment_mode": _get_dist("PreferredPaymentMode"),
            "by_preferred_login_device": _get_dist("PreferredLoginDevice"),
        }

    def get_tenure_analysis(self) -> Dict[str, Any]:
        """
        Return customer tenure cohort analysis and churn correlation.
        """
        if not self.is_dataset_available() or "Tenure" not in self.df.columns or "Churn" not in self.df.columns:
            return {
                "dataset_available": False,
                "message": (
                    f"Dataset CSV not found at '{self.dataset_path}'. "
                    "Set DATASET_PATH environment variable to view tenure cohort breakdown."
                ),
            }

        bins = [-1, 6, 12, 24, 60, 100]
        labels = ["0-6 Months", "6-12 Months", "1-2 Years", "2-5 Years", "5+ Years"]
        df_copy = self.df.copy()
        df_copy["TenureCohort"] = pd.cut(df_copy["Tenure"], bins=bins, labels=labels)

        grouped = df_copy.groupby("TenureCohort", observed=False)["Churn"].agg(
            total_customers="count",
            churned_customers="sum"
        ).reset_index()
        grouped["retained_customers"] = grouped["total_customers"] - grouped["churned_customers"]
        grouped["churn_rate_percent"] = (
            (grouped["churned_customers"] / grouped["total_customers"]) * 100
        ).round(2)

        return {
            "dataset_available": True,
            "tenure_cohorts": grouped.to_dict(orient="records"),
            "average_tenure": round(float(self.df["Tenure"].mean()), 2),
            "median_tenure": round(float(self.df["Tenure"].median()), 2),
        }

    def get_segments(self) -> Dict[str, Any]:
        """
        Combine customer segmentation metrics across tenure, gender, order category, and marital status.
        """
        churn_dist = self.get_churn_distribution()
        tenure_dist = self.get_tenure_analysis()

        if not self.is_dataset_available():
            return {
                "dataset_available": False,
                "message": (
                    f"Dataset CSV not found at '{self.dataset_path}'. "
                    "Provide dataset via DATASET_PATH environment variable to inspect customer segments."
                ),
            }

        return {
            "dataset_available": True,
            "gender_segments": churn_dist.get("by_gender", []),
            "order_category_segments": churn_dist.get("by_preferred_order_category", []),
            "marital_status_segments": churn_dist.get("by_marital_status", []),
            "tenure_segments": tenure_dist.get("tenure_cohorts", []),
        }

    def get_feature_importance(self) -> Dict[str, Any]:
        """
        Extract model feature importance directly from the trained XGBoost pipeline.
        """
        importances = self.prediction_service.get_feature_importance()
        return {
            "model_name": "XGBoost Challenger Pipeline",
            "total_features": len(importances),
            "feature_importance": importances,
        }
