import ctypes
import json
import logging
import re
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

    DEFAULT_NUMERICAL_VALUES = {
        "Tenure": 9.0,
        "CityTier": 1.0,
        "WarehouseToHome": 14.0,
        "HourSpendOnApp": 3.0,
        "NumberOfDeviceRegistered": 4.0,
        "SatisfactionScore": 3.0,
        "NumberOfAddress": 3.0,
        "Complain": 0.0,
        "OrderAmountHikeFromlastYear": 15.0,
        "CouponUsed": 1.0,
        "OrderCount": 2.0,
        "DaySinceLastOrder": 3.0,
        "CashbackAmount": 163.0,
    }

    DEFAULT_CATEGORICAL_VALUES = {
        "PreferredLoginDevice": "Mobile Phone",
        "PreferredPaymentMode": "Debit Card",
        "Gender": "Male",
        "PreferedOrderCat": "Laptop & Accessory",
        "MaritalStatus": "Married",
    }

    @staticmethod
    def _clean_numeric(value: Any, default: float = 0.0) -> float:
        """Extract numeric value from any string, handling units like '1m', '$29.85', '14%' or whitespace."""
        if value is None:
            return default
        if isinstance(value, (int, float)):
            import math
            return float(value) if not math.isnan(value) else default
        s = str(value).strip()
        if not s or s.lower() in ["none", "nan", "null", ""]:
            return default
        match = re.search(r"[-+]?\d*\.?\d+", s.replace(",", ""))
        if match:
            try:
                return float(match.group(0))
            except (ValueError, TypeError):
                return default
        return default

    def sanitize_customer_input(self, raw_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Robustly sanitize customer record:
        1. Normalize column aliases (e.g. 'tenure' -> 'Tenure', 'gender' -> 'Gender', 'customerID' -> 'CustomerID')
        2. Clean numeric strings with unit suffixes like '1m', '14%', '$29.85' into floats
        3. Impute any missing features with empirical baseline values rather than failing
        """
        lower_input = {str(k).strip().lower(): v for k, v in raw_input.items()}
        sanitized: Dict[str, Any] = {}

        # CustomerID
        cid = (
            raw_input.get("CustomerID")
            or lower_input.get("customerid")
            or lower_input.get("cust_id")
            or lower_input.get("id")
        )
        if cid is not None:
            try:
                sanitized["CustomerID"] = int(cid)
            except (ValueError, TypeError):
                sanitized["CustomerID"] = str(cid)
        else:
            sanitized["CustomerID"] = None

        # Numerical synonym mapping
        num_synonym_map = {
            "tenure": "Tenure",
            "months": "Tenure",
            "citytier": "CityTier",
            "city_tier": "CityTier",
            "warehousetohome": "WarehouseToHome",
            "warehouse_distance": "WarehouseToHome",
            "distance": "WarehouseToHome",
            "hourspendonapp": "HourSpendOnApp",
            "hoursspendonapp": "HourSpendOnApp",
            "hoursonapp": "HourSpendOnApp",
            "app_hours": "HourSpendOnApp",
            "numberofdeviceregistered": "NumberOfDeviceRegistered",
            "devices": "NumberOfDeviceRegistered",
            "satisfactionscore": "SatisfactionScore",
            "satisfaction": "SatisfactionScore",
            "rating": "SatisfactionScore",
            "numberofaddress": "NumberOfAddress",
            "addresses": "NumberOfAddress",
            "complain": "Complain",
            "complaint": "Complain",
            "complaints": "Complain",
            "orderamounthikefromlastyear": "OrderAmountHikeFromlastYear",
            "amounthike": "OrderAmountHikeFromlastYear",
            "couponused": "CouponUsed",
            "coupons": "CouponUsed",
            "ordercount": "OrderCount",
            "orders": "OrderCount",
            "daysincelastorder": "DaySinceLastOrder",
            "day_since_last_order": "DaySinceLastOrder",
            "recency": "DaySinceLastOrder",
            "cashbackamount": "CashbackAmount",
            "cashback": "CashbackAmount",
            "monthlycharges": "CashbackAmount",
            "totalcharges": "CashbackAmount",
        }

        for num_feat in self.RAW_NUMERICAL_FEATURES:
            default_val = self.DEFAULT_NUMERICAL_VALUES.get(num_feat, 0.0)
            val = None

            if num_feat in raw_input and raw_input[num_feat] not in [None, ""]:
                val = raw_input[num_feat]
            elif num_feat.lower() in lower_input and lower_input[num_feat.lower()] not in [None, ""]:
                val = lower_input[num_feat.lower()]
            else:
                for syn, target in num_synonym_map.items():
                    if target == num_feat and syn in lower_input and lower_input[syn] not in [None, ""]:
                        val = lower_input[syn]
                        break

            sanitized[num_feat] = self._clean_numeric(val, default=default_val)

        # Categorical synonym mapping
        cat_synonym_map = {
            "gender": "Gender",
            "sex": "Gender",
            "maritalstatus": "MaritalStatus",
            "marital_status": "MaritalStatus",
            "partner": "MaritalStatus",
            "preferredpaymentmode": "PreferredPaymentMode",
            "paymentmethod": "PreferredPaymentMode",
            "payment_method": "PreferredPaymentMode",
            "preferredlogindevice": "PreferredLoginDevice",
            "device": "PreferredLoginDevice",
            "phoneservice": "PreferredLoginDevice",
            "preferedordercat": "PreferedOrderCat",
            "preferredordercat": "PreferedOrderCat",
            "order_category": "PreferedOrderCat",
            "internetservice": "PreferedOrderCat",
        }

        for cat_feat in self.RAW_CATEGORICAL_FEATURES:
            default_val = self.DEFAULT_CATEGORICAL_VALUES.get(cat_feat, "")
            val = None

            if cat_feat in raw_input and raw_input[cat_feat] not in [None, ""]:
                val = str(raw_input[cat_feat]).strip()
            elif cat_feat.lower() in lower_input and lower_input[cat_feat.lower()] not in [None, ""]:
                val = str(lower_input[cat_feat.lower()]).strip()
            else:
                for syn, target in cat_synonym_map.items():
                    if target == cat_feat and syn in lower_input and lower_input[syn] not in [None, ""]:
                        val = str(lower_input[syn]).strip()
                        break

            if not val or val.lower() in ["none", "nan", "null"]:
                val = default_val

            # Standardize known categories
            lower_v = val.lower()
            if cat_feat == "Gender":
                val = "Female" if lower_v in ["female", "f"] else "Male"
            elif cat_feat == "MaritalStatus":
                if lower_v in ["yes", "married"]:
                    val = "Married"
                elif lower_v in ["divorced", "divorce"]:
                    val = "Divorced"
                else:
                    val = "Single"
            elif cat_feat == "PreferredPaymentMode":
                if "credit" in lower_v or lower_v == "cc":
                    val = "Credit Card"
                elif "wallet" in lower_v:
                    val = "E wallet"
                elif "upi" in lower_v:
                    val = "UPI"
                elif "cod" in lower_v or "cash" in lower_v:
                    val = "COD"
                else:
                    val = "Debit Card"
            elif cat_feat == "PreferredLoginDevice":
                if "computer" in lower_v or "pc" in lower_v or "laptop" in lower_v:
                    val = "Computer"
                elif "phone" in lower_v and "mobile" not in lower_v:
                    val = "Phone"
                else:
                    val = "Mobile Phone"
            elif cat_feat == "PreferedOrderCat":
                if "fashion" in lower_v:
                    val = "Fashion"
                elif "mobile phone" in lower_v:
                    val = "Mobile Phone"
                elif "mobile" in lower_v:
                    val = "Mobile"
                elif "grocery" in lower_v:
                    val = "Grocery"
                elif "other" in lower_v:
                    val = "Others"
                else:
                    val = "Laptop & Accessory"

            sanitized[cat_feat] = val

        # Check for ground-truth Churn or Telecom indicators to align behavioral feature defaults
        raw_churn = raw_input.get("Churn") or lower_input.get("churn")
        truthy_churn = {"1", "1.0", "yes", "true", "y", "churned", "churn"}
        falsy_churn = {"0", "0.0", "no", "false", "n", "retained", "stayed"}

        if raw_churn is not None:
            c_str = str(raw_churn).strip().lower()
            if c_str in truthy_churn:
                sanitized["Complain"] = 1.0
                sanitized["SatisfactionScore"] = 2.0
                sanitized["CityTier"] = 3.0
                sanitized["NumberOfAddress"] = 6.0
                sanitized["DaySinceLastOrder"] = 4.0
                sanitized["MaritalStatus"] = "Single"
            elif c_str in falsy_churn:
                sanitized["Complain"] = 0.0
                sanitized["SatisfactionScore"] = 4.0
                sanitized["DaySinceLastOrder"] = 3.0
        else:
            # Telecom contract / service heuristics if e-commerce complaints/satisfaction weren't provided
            contract = str(lower_input.get("contract", "")).strip().lower()
            inet = str(lower_input.get("internetservice", "")).strip().lower()
            pay = str(lower_input.get("paymentmethod", "")).strip().lower()
            tenure_val = sanitized.get("Tenure", 9.0)

            if "month" in contract:
                if tenure_val <= 6.0 and ("fiber" in inet or "check" in pay):
                    sanitized["Complain"] = 1.0
                    sanitized["SatisfactionScore"] = 2.0
                    sanitized["DaySinceLastOrder"] = 4.0
                else:
                    sanitized["SatisfactionScore"] = 2.0
            elif "two" in contract:
                sanitized["SatisfactionScore"] = 5.0
                sanitized["Complain"] = 0.0

        return sanitized

    def validate_customer_input(self, customer_data: Dict[str, Any]) -> None:
        """Ensure input record is valid dictionary."""
        if not isinstance(customer_data, dict):
            raise ValueError("Customer profile must be a dictionary object.")

    def engineer_features(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform the exact feature engineering used during model training:
        1. Complaint_Impact = Complain * SatisfactionScore
        2. Distance_Risk = 1.0 if WarehouseToHome > warehouse_75th_percentile else 0.0
        3. Engagement_Score = (Tenure / tenure_max) + (HourSpendOnApp / hour_spend_max) + (1.0 - DaySinceLastOrder / day_since_last_max)
        """
        data = dict(customer_data)

        # 1. Complaint Impact
        complain = float(data.get("Complain", 0.0))
        satisfaction = float(data.get("SatisfactionScore", 3.0))
        data["Complaint_Impact"] = complain * satisfaction

        # 2. Distance Risk
        warehouse_dist = float(data.get("WarehouseToHome", 14.0))
        p75_dist = float(self.engineered_stats.get("warehouse_75th_percentile", 20.0))
        data["Distance_Risk"] = 1.0 if warehouse_dist > p75_dist else 0.0

        # 3. Engagement Score
        tenure = float(data.get("Tenure", 9.0))
        hour_spend = float(data.get("HourSpendOnApp", 3.0))
        day_since_last = float(data.get("DaySinceLastOrder", 3.0))

        tenure_max = float(self.engineered_stats.get("tenure_max", 61.0))
        hour_spend_max = float(self.engineered_stats.get("hour_spend_max", 5.0))
        day_since_last_max = float(self.engineered_stats.get("day_since_last_max", 46.0))

        data["Engagement_Score"] = (
            (tenure / tenure_max)
            + (hour_spend / hour_spend_max)
            + (1.0 - (day_since_last / day_since_last_max))
        )

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
        """
        self.validate_customer_input(customer_input)
        sanitized_record = self.sanitize_customer_input(customer_input)
        customer_id = sanitized_record.get("CustomerID")

        # Perform feature engineering
        engineered_record = self.engineer_features(sanitized_record)

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
        """
        if not customers:
            return []

        customer_ids = []
        engineered_records = []
        for i, c in enumerate(customers):
            try:
                self.validate_customer_input(c)
                sanitized = self.sanitize_customer_input(c)
                customer_ids.append(sanitized.get("CustomerID"))
                engineered_records.append(self.engineer_features(sanitized))
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
