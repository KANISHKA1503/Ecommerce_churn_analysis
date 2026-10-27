import ctypes
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import pandas as pd
import xgboost as xgb
from xgboost.core import _LIB, _check_call, c_array, c_bst_ulong

logger = logging.getLogger("prediction_service")

# ---------------------------------------------------------------------------
# Compatibility Booster Deserializer
# Resolves cross-environment UBJSON serialization quirks between Google Colab
# and Windows XGBoost 3.4.1 C++ engine without altering pipeline weights.
# ---------------------------------------------------------------------------

class _UBJsonReader:
    """Minimal Universal Binary JSON (UBJSON) parser for XGBoost booster payloads."""

    def __init__(self, data: bytes):
        self.data = data
        self.pos = 0

    def parse_by_type(self, tag: str) -> Any:
        if tag == "Z":
            return None
        elif tag == "T":
            return True
        elif tag == "F":
            return False
        elif tag == "i":
            val = int.from_bytes(self.data[self.pos : self.pos + 1], "big", signed=True)
            self.pos += 1
            return val
        elif tag == "U":
            val = self.data[self.pos]
            self.pos += 1
            return val
        elif tag == "I":
            val = int.from_bytes(self.data[self.pos : self.pos + 2], "big", signed=True)
            self.pos += 2
            return val
        elif tag == "l":
            val = int.from_bytes(self.data[self.pos : self.pos + 4], "big", signed=True)
            self.pos += 4
            return val
        elif tag == "L":
            val = int.from_bytes(self.data[self.pos : self.pos + 8], "big", signed=True)
            self.pos += 8
            return val
        elif tag == "d":
            import struct
            val = struct.unpack(">f", self.data[self.pos : self.pos + 4])[0]
            self.pos += 4
            return val
        elif tag == "D":
            import struct
            val = struct.unpack(">d", self.data[self.pos : self.pos + 8])[0]
            self.pos += 8
            return val
        elif tag == "S":
            length = self._read_int()
            s = self.data[self.pos : self.pos + length].decode("utf-8", errors="replace")
            self.pos += length
            return s
        raise ValueError(f"Unknown UBJSON type tag: {tag}")

    def read_val(self) -> Any:
        if self.pos >= len(self.data):
            return None
        tag = chr(self.data[self.pos])
        self.pos += 1
        if tag in ("Z", "T", "F", "i", "U", "I", "l", "L", "d", "D", "S"):
            return self.parse_by_type(tag)
        elif tag == "[":
            items = []
            if self.pos < len(self.data) and chr(self.data[self.pos]) == "$":
                self.pos += 1
                type_tag = chr(self.data[self.pos])
                self.pos += 1
                assert chr(self.data[self.pos]) == "#"
                self.pos += 1
                count = self._read_int()
                for _ in range(count):
                    items.append(self.parse_by_type(type_tag))
                return items
            elif self.pos < len(self.data) and chr(self.data[self.pos]) == "#":
                self.pos += 1
                count = self._read_int()
                for _ in range(count):
                    items.append(self.read_val())
                return items
            else:
                while self.pos < len(self.data) and chr(self.data[self.pos]) != "]":
                    items.append(self.read_val())
                if self.pos < len(self.data) and chr(self.data[self.pos]) == "]":
                    self.pos += 1
                return items
        elif tag == "{":
            obj = {}
            if self.pos < len(self.data) and chr(self.data[self.pos]) == "$":
                self.pos += 1
                type_tag = chr(self.data[self.pos])
                self.pos += 1
                assert chr(self.data[self.pos]) == "#"
                self.pos += 1
                count = self._read_int()
                for _ in range(count):
                    k = self._read_key()
                    obj[k] = self.parse_by_type(type_tag)
                return obj
            elif self.pos < len(self.data) and chr(self.data[self.pos]) == "#":
                self.pos += 1
                count = self._read_int()
                for _ in range(count):
                    k = self._read_key()
                    obj[k] = self.read_val()
                return obj
            else:
                while self.pos < len(self.data) and chr(self.data[self.pos]) != "}":
                    k = self._read_key()
                    obj[k] = self.read_val()
                if self.pos < len(self.data) and chr(self.data[self.pos]) == "}":
                    self.pos += 1
                return obj
        raise ValueError(f"Unknown UBJSON tag: {tag} at byte offset {self.pos - 1}")

    def _read_int(self) -> int:
        t = chr(self.data[self.pos])
        self.pos += 1
        if t == "i":
            v = int.from_bytes(self.data[self.pos : self.pos + 1], "big", signed=True)
            self.pos += 1
            return v
        elif t == "U":
            v = self.data[self.pos]
            self.pos += 1
            return v
        elif t == "I":
            v = int.from_bytes(self.data[self.pos : self.pos + 2], "big", signed=True)
            self.pos += 2
            return v
        elif t == "l":
            v = int.from_bytes(self.data[self.pos : self.pos + 4], "big", signed=True)
            self.pos += 4
            return v
        elif t == "L":
            v = int.from_bytes(self.data[self.pos : self.pos + 8], "big", signed=True)
            self.pos += 8
            return v
        raise ValueError(f"Expected int tag, got {t} at byte offset {self.pos - 1}")

    def _read_key(self) -> str:
        length = self._read_int()
        k = self.data[self.pos : self.pos + length].decode("utf-8", errors="replace")
        self.pos += length
        return k


_orig_booster_setstate = xgb.core.Booster.__setstate__

def _safe_booster_setstate(self, state):
    try:
        _orig_booster_setstate(self, state)
    except Exception as exc:
        logger.debug(f"Direct Booster.__setstate__ failed ({exc}), applying compatibility unmarshaller.")
        raw_handle = state.get("handle") if isinstance(state, dict) else state
        parsed = _UBJsonReader(bytes(raw_handle)).read_val()
        model_part = parsed["Model"]
        model_bytes = bytearray(json.dumps(model_part).encode("utf-8"))

        dmats = c_array(ctypes.c_void_p, [])
        self.handle = ctypes.c_void_p()
        _check_call(_LIB.XGBoosterCreate(dmats, c_bst_ulong(0), ctypes.byref(self.handle)))
        self.load_model(model_bytes)

xgb.core.Booster.__setstate__ = _safe_booster_setstate


# ---------------------------------------------------------------------------
# Prediction Service
# ---------------------------------------------------------------------------

class PredictionService:
    """
    Production-grade prediction service for customer churn risk scoring.
    Loads the trained pipeline, validates raw customer records, performs
    exact mathematical feature engineering, and provides individual and batch scoring.
    """

    RAW_NUMERICAL_FEATURES = [
        "Tenure",
        "CityTier",
        "WarehouseToHome",
        "HourSpendOnApp",
        "NumberOfDeviceRegistered",
        "SatisfactionScore",
        "NumberOfAddress",
        "Complain",
        "OrderAmountHikeFromlastYear",
        "CouponUsed",
        "OrderCount",
        "DaySinceLastOrder",
        "CashbackAmount",
    ]

    RAW_CATEGORICAL_FEATURES = [
        "PreferredLoginDevice",
        "PreferredPaymentMode",
        "Gender",
        "PreferedOrderCat",
        "MaritalStatus",
    ]

    ENGINEERED_FEATURES = [
        "Complaint_Impact",
        "Distance_Risk",
        "Engagement_Score",
    ]

    def __init__(
        self,
        model_dir: Optional[Union[str, Path]] = None,
        low_risk_threshold: float = 0.35,
        high_risk_threshold: float = 0.65,
    ):
        """
        Initialize PredictionService.

        Args:
            model_dir: Directory containing model artifacts (default: backend/model).
            low_risk_threshold: Maximum probability for 'Low Risk' category (default: 0.35).
            high_risk_threshold: Minimum probability for 'High Risk' category (default: 0.65).
        """
        self.base_dir = Path(model_dir) if model_dir else Path(__file__).resolve().parent / "model"
        self.pipeline_path = self.base_dir / "churn_pipeline.joblib"
        self.schema_path = self.base_dir / "feature_schema.json"
        self.metadata_path = self.base_dir / "model_metadata.json"

        self.low_risk_threshold = low_risk_threshold
        self.high_risk_threshold = high_risk_threshold

        self.pipeline = None
        self.schema: Dict[str, Any] = {}
        self.metadata: Dict[str, Any] = {}
        self.engineered_stats: Dict[str, float] = {}
        self.expected_numerical_features: List[str] = []
        self.expected_categorical_features: List[str] = []

        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """Load schema, metadata, and the trained scikit-learn/imblearn pipeline."""
        if not self.schema_path.exists():
            raise FileNotFoundError(f"Feature schema not found at {self.schema_path}")
        with open(self.schema_path, "r", encoding="utf-8") as f:
            self.schema = json.load(f)

        if not self.metadata_path.exists():
            raise FileNotFoundError(f"Model metadata not found at {self.metadata_path}")
        with open(self.metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        if not self.pipeline_path.exists():
            raise FileNotFoundError(f"Model pipeline not found at {self.pipeline_path}")
        
        try:
            self.pipeline = joblib.load(self.pipeline_path)
            logger.info("Successfully loaded churn prediction pipeline.")
        except Exception as exc:
            raise RuntimeError(f"Failed to deserialize model pipeline from {self.pipeline_path}: {exc}") from exc

        # Extract features and stats from schema
        self.expected_numerical_features = self.schema.get("numerical_features", [])
        self.expected_categorical_features = self.schema.get("categorical_features", [])
        self.engineered_stats = self.schema.get("engineered_features_statistics", {})

        # Verify statistics presence
        required_stats = ["warehouse_75th_percentile", "tenure_max", "hour_spend_max", "day_since_last_max"]
        missing_stats = [stat for stat in required_stats if stat not in self.engineered_stats]
        if missing_stats:
            raise ValueError(f"Feature schema is missing engineered feature statistics: {missing_stats}")

    def validate_customer_input(self, customer_data: Dict[str, Any]) -> None:
        """
        Strictly validate raw customer input data.
        Ensures all 13 numerical and 5 categorical features exist and are not None.
        CustomerID and Churn are excluded from validation.
        """
        missing_fields = []
        for feature in self.RAW_NUMERICAL_FEATURES:
            if feature not in customer_data or customer_data[feature] is None:
                missing_fields.append(feature)

        for feature in self.RAW_CATEGORICAL_FEATURES:
            if feature not in customer_data or customer_data[feature] is None:
                missing_fields.append(feature)

        if missing_fields:
            raise ValueError(
                f"Missing required customer features: {missing_fields}. "
                "Default values will not be silently substituted."
            )

    def engineer_features(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform the exact feature engineering used during model training:
        1. Complaint_Impact = Complain * SatisfactionScore
        2. Distance_Risk = 1.0 if WarehouseToHome > warehouse_75th_percentile else 0.0
        3. Engagement_Score = (Tenure / tenure_max) + (HourSpendOnApp / hour_spend_max) + (1.0 - DaySinceLastOrder / day_since_last_max)
        """
        data = dict(customer_data)

        # 1. Complaint Impact
        complain = float(data["Complain"])
        satisfaction = float(data["SatisfactionScore"])
        complaint_impact = complain * satisfaction
        data["Complaint_Impact"] = complaint_impact

        # 2. Distance Risk
        warehouse_dist = float(data["WarehouseToHome"])
        p75_dist = float(self.engineered_stats["warehouse_75th_percentile"])
        distance_risk = 1.0 if warehouse_dist > p75_dist else 0.0
        data["Distance_Risk"] = distance_risk

        # 3. Engagement Score
        tenure = float(data["Tenure"])
        hour_spend = float(data["HourSpendOnApp"])
        day_since_last = float(data["DaySinceLastOrder"])

        tenure_max = float(self.engineered_stats["tenure_max"])
        hour_spend_max = float(self.engineered_stats["hour_spend_max"])
        day_since_last_max = float(self.engineered_stats["day_since_last_max"])

        engagement_score = (
            (tenure / tenure_max)
            + (hour_spend / hour_spend_max)
            + (1.0 - (day_since_last / day_since_last_max))
        )
        data["Engagement_Score"] = engagement_score

        return data

    def determine_risk_level(self, churn_prob: float) -> str:
        """
        Classify churn probability into risk categories based on configured thresholds:
        - Low Risk: prob < low_risk_threshold (default 0.35)
        - Medium Risk: low_risk_threshold <= prob < high_risk_threshold (default 0.35 to 0.65)
        - High Risk: prob >= high_risk_threshold (default >= 0.65)
        """
        if churn_prob >= self.high_risk_threshold:
            return "High Risk"
        elif churn_prob >= self.low_risk_threshold:
            return "Medium Risk"
        return "Low Risk"

    def predict(self, customer_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate churn prediction and risk assessment for an individual customer.

        Args:
            customer_input: Dictionary with customer features.

        Returns:
            Dictionary with prediction results and risk assessment.
        """
        # Validate incoming data
        self.validate_customer_input(customer_input)

        # Extract CustomerID if provided
        customer_id = customer_input.get("CustomerID")

        # Perform feature engineering
        engineered_record = self.engineer_features(customer_input)

        # Build DataFrame with exact expected feature order (16 num + 5 cat)
        expected_columns = self.expected_numerical_features + self.expected_categorical_features
        df = pd.DataFrame([engineered_record])[expected_columns]

        # Model inference
        prob_array = self.pipeline.predict_proba(df)[0]
        churn_prob = float(prob_array[1])
        prediction = int(self.pipeline.predict(df)[0])
        risk_level = self.determine_risk_level(churn_prob)
        prediction_label = "Churned" if prediction == 1 else "Retained"

        result = {
            "customer_id": customer_id,
            "churn_prediction": prediction,
            "churn_probability": round(churn_prob, 4),
            "risk_level": risk_level,
            "prediction_label": prediction_label,
            "risk_score_percent": round(churn_prob * 100, 2),
            "engineered_features": {
                "Complaint_Impact": round(float(engineered_record["Complaint_Impact"]), 4),
                "Distance_Risk": round(float(engineered_record["Distance_Risk"]), 4),
                "Engagement_Score": round(float(engineered_record["Engagement_Score"]), 4),
            },
        }

        return result

    def predict_batch(self, customers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate batch churn predictions for multiple customer records.

        Args:
            customers: List of customer dictionaries.

        Returns:
            List of prediction dictionaries.
        """
        if not customers:
            return []

        # Validate and engineer all records
        customer_ids = []
        engineered_records = []
        for i, c in enumerate(customers):
            try:
                self.validate_customer_input(c)
                customer_ids.append(c.get("CustomerID"))
                engineered_records.append(self.engineer_features(c))
            except Exception as e:
                raise ValueError(f"Record at index {i} invalid: {e}") from e

        # Arrange DataFrame with exact 16 num + 5 cat columns
        expected_columns = self.expected_numerical_features + self.expected_categorical_features
        df = pd.DataFrame(engineered_records)[expected_columns]

        # Batch inference
        predictions = self.pipeline.predict(df)
        probabilities = self.pipeline.predict_proba(df)

        results = []
        for i in range(len(customers)):
            churn_prob = float(probabilities[i][1])
            pred = int(predictions[i])
            risk_level = self.determine_risk_level(churn_prob)
            label = "Churned" if pred == 1 else "Retained"

            results.append({
                "customer_id": customer_ids[i],
                "churn_prediction": pred,
                "churn_probability": round(churn_prob, 4),
                "risk_level": risk_level,
                "prediction_label": label,
                "risk_score_percent": round(churn_prob * 100, 2),
                "engineered_features": {
                    "Complaint_Impact": round(float(engineered_records[i]["Complaint_Impact"]), 4),
                    "Distance_Risk": round(float(engineered_records[i]["Distance_Risk"]), 4),
                    "Engagement_Score": round(float(engineered_records[i]["Engagement_Score"]), 4),
                },
            })

        return results

    def get_feature_importance(self) -> List[Dict[str, Any]]:
        """
        Extract feature importances from the trained XGBoost model within the pipeline.
        Returns list of feature names and normalized importance scores sorted descending.
        """
        try:
            preprocessor = self.pipeline.named_steps["preprocessor"]
            classifier = self.pipeline.named_steps["classifier"]

            feature_names = list(preprocessor.get_feature_names_out())
            importances = classifier.feature_importances_

            ranked = sorted(
                [{"feature": name, "importance": round(float(score), 4)} for name, score in zip(feature_names, importances)],
                key=lambda x: x["importance"],
                reverse=True,
            )
            return ranked
        except Exception as exc:
            logger.warning(f"Could not compute feature importance from pipeline: {exc}")
            return []
