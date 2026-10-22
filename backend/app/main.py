from __future__ import annotations

import hashlib
import json
import os
import re
import uuid
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Literal, Optional

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from pydantic import BaseModel, Field
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from .data_cleaner import clean_dataset

APP_DIR = Path(__file__).resolve().parent.parent
load_dotenv(APP_DIR / ".env")
STORAGE = Path(os.getenv("DEMANDX_STORAGE", str(APP_DIR / "storage"))).resolve()
STORAGE.mkdir(parents=True, exist_ok=True)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()

app = FastAPI(title="DemandX API", version="2.0.0")
origins = [
    x.strip()
    for x in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,https://demand-x-snowy.vercel.app"
    ).split(",")
    if x.strip()
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class CleanRequest(BaseModel):
    date_col: Optional[str] = None
    target_col: Optional[str] = None

class AnalyticsRequest(BaseModel):
    date_col: str
    target_col: str
    product_col: Optional[str] = None

class ForecastRequest(BaseModel):
    date_col: str
    target_col: str
    forecast_date: date
    product_col: Optional[str] = None
    product_value: Optional[str] = None
    model: Literal["gradient_boosting", "random_forest"] = "gradient_boosting"

class TrainRequest(BaseModel):
    date_col: str
    target_col: str
    product_col: Optional[str] = None
    product_value: Optional[str] = None
    model: Literal["gradient_boosting", "random_forest"] = "gradient_boosting"

class ProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=80)
    organization: str = Field(default="", max_length=120)


def current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google login is not configured yet. Set GOOGLE_CLIENT_ID in backend/.env and VITE_GOOGLE_CLIENT_ID in frontend/.env.")
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in with Google to continue.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        claims = id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(status_code=401, detail="Your Google sign-in has expired or could not be verified. Please sign in again.")
    if not claims.get("sub") or not claims.get("email_verified", False):
        raise HTTPException(status_code=401, detail="A verified Google account is required.")
    return {"sub": claims["sub"], "email": claims.get("email", ""), "name": claims.get("name", "User"), "picture": claims.get("picture", "")}


def user_root(user: dict) -> Path:
    # Do not use email or user-supplied strings as filesystem paths.
    key = hashlib.sha256(user["sub"].encode("utf-8")).hexdigest()[:32]
    root = STORAGE / key
    root.mkdir(parents=True, exist_ok=True)
    (root / "datasets").mkdir(exist_ok=True)
    return root


def dataset_paths(user: dict, dataset_id: str):
    if not re.fullmatch(r"[a-f0-9-]{36}", dataset_id):
        raise HTTPException(status_code=400, detail="Invalid dataset ID.")
    root = user_root(user) / "datasets" / dataset_id
    meta_path = root / "meta.json"
    data_path = root / "data.csv"
    if not meta_path.exists() or not data_path.exists():
        raise HTTPException(status_code=404, detail="Dataset not found. Upload it again if it was removed.")
    return root, meta_path, data_path


def read_meta(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def load_frame(user: dict, dataset_id: str) -> tuple[pd.DataFrame, dict, Path]:
    root, meta_path, data_path = dataset_paths(user, dataset_id)
    meta = read_meta(meta_path)
    df = pd.read_csv(data_path, low_memory=False)
    dcol = meta.get("date_col")
    if dcol and dcol in df.columns:
        df[dcol] = pd.to_datetime(df[dcol], errors="coerce")
    return df, meta, root


def json_safe(value):
    if value is None: return None
    if isinstance(value, (np.integer,)): return int(value)
    if isinstance(value, (np.floating,)): return None if not np.isfinite(value) else float(value)
    if isinstance(value, (pd.Timestamp, datetime, date)): return value.isoformat()
    if pd.isna(value): return None
    return value.item() if hasattr(value, "item") else value


def records(df: pd.DataFrame, limit: int = 100):
    safe = df.head(limit).copy()
    for col in safe.columns:
        if pd.api.types.is_datetime64_any_dtype(safe[col]):
            safe[col] = safe[col].dt.strftime("%Y-%m-%d")
    safe = safe.replace({np.nan: None})
    return [{str(k): json_safe(v) for k, v in row.items()} for row in safe.to_dict(orient="records")]


def infer_column(columns, hints):
    lowered = {c: re.sub(r"[^a-z0-9]+", "_", str(c).lower()).strip("_") for c in columns}
    for hint in hints:
        for col, norm in lowered.items():
            if norm == hint or hint in norm.split("_"):
                return col
    return None


def is_order_count_column(column: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", "_", str(column).lower()).strip("_")
    parts = set(normalized.split("_"))
    return "orders" in parts or "count" in parts or "transactions" in parts or "order_count" in normalized or "transaction_count" in normalized


def detect_columns(df: pd.DataFrame) -> dict:
    date_col = None
    for c in df.columns:
        name = str(c).lower()
        if any(k in name for k in ["date", "timestamp", "datetime", "order_time", "created_at"]):
            parsed = pd.to_datetime(df[c], errors="coerce")
            if parsed.notna().mean() >= 0.5:
                date_col = c; break
    if date_col is None:
        for c in df.columns:
            parsed = pd.to_datetime(df[c], errors="coerce")
            if parsed.notna().mean() >= 0.85 and not pd.api.types.is_numeric_dtype(df[c]):
                date_col = c; break
    target_col = infer_column(df.columns, ["demand", "orders", "order_count", "quantity", "qty", "units_sold", "sales", "units", "target"])
    if target_col and not pd.to_numeric(df[target_col], errors="coerce").notna().any(): target_col = None
    if target_col is None:
        numeric = [c for c in df.select_dtypes(include=np.number).columns if c != date_col]
        target_col = numeric[0] if numeric else None
    product_col = infer_column(df.columns, ["product", "product_name", "sku", "item", "item_name", "category", "product_category"])
    return {"date_col": date_col, "target_col": target_col, "product_col": product_col}


def require_columns(df, *cols):
    missing = [c for c in cols if c and c not in df.columns]
    if missing: raise HTTPException(status_code=400, detail=f"Column not found: {', '.join(missing)}")


def daily_series(df: pd.DataFrame, date_col: str, target_col: str, product_col: Optional[str] = None, product_value: Optional[str] = None):
    require_columns(df, date_col, target_col, product_col)
    work = df.drop_duplicates().copy()
    work[date_col] = pd.to_datetime(work[date_col], errors="coerce")
    work[target_col] = pd.to_numeric(work[target_col], errors="coerce").replace([np.inf, -np.inf], np.nan)
    work = work.dropna(subset=[date_col, target_col])
    if product_col and product_value is not None:
        work = work[work[product_col].astype(str) == str(product_value)]
    if work.empty: raise HTTPException(status_code=400, detail="No usable rows match the selected date, demand, and product filters.")
    # Sum numeric demand per day; this is the appropriate default for units/sales columns.
    grouped = work.groupby(work[date_col].dt.floor("D"))[target_col].sum().sort_index()
    idx = pd.date_range(grouped.index.min(), grouped.index.max(), freq="D")
    series = grouped.reindex(idx, fill_value=0.0).astype(float)
    series.index.name = "date"
    return series


def features_for_series(series: pd.Series) -> pd.DataFrame:
    df = pd.DataFrame({"y": series.astype(float)})
    idx = pd.DatetimeIndex(df.index)
    df["dow"] = idx.day_of_week
    df["day"] = idx.day
    df["month"] = idx.month
    df["year"] = idx.year
    df["is_weekend"] = (idx.day_of_week >= 5).astype(int)
    for lag in (1, 7, 14): df[f"lag_{lag}"] = df["y"].shift(lag)
    df["rolling_7"] = df["y"].shift(1).rolling(7, min_periods=3).mean()
    df["rolling_14"] = df["y"].shift(1).rolling(14, min_periods=5).mean()
    return df.dropna()


def make_estimator(name: str):
    if name == "random_forest": return RandomForestRegressor(n_estimators=160, min_samples_leaf=2, random_state=42, n_jobs=-1)
    if name == "gradient_boosting": return GradientBoostingRegressor(n_estimators=120, max_depth=2, learning_rate=0.04, loss="huber", random_state=42)
    raise HTTPException(status_code=400, detail="Choose a supported forecast model.")


def evaluate_series(series: pd.Series, model_name: str, measure: Optional[str] = None):
    featured = features_for_series(series)
    if len(featured) < 12:
        raise HTTPException(status_code=400, detail="Not enough usable daily history to evaluate a model. At least 26 calendar days are needed; 30+ days are preferable.")
    split = max(8, int(len(featured) * 0.8))
    if split >= len(featured): split = len(featured) - 1
    train, test = featured.iloc[:split], featured.iloc[split:]
    model = make_estimator(model_name)
    model.fit(train.drop(columns="y"), train["y"])
    pred = np.maximum(0, model.predict(test.drop(columns="y")))
    actual = test["y"].to_numpy()
    baseline = np.maximum(0, test["lag_7"].to_numpy())
    if measure and is_order_count_column(measure):
        pred = np.rint(pred)
        baseline = np.rint(baseline)
    metrics = {
        "mae": float(mean_absolute_error(actual, pred)),
        "rmse": float(np.sqrt(mean_squared_error(actual, pred))),
        "r2": float(r2_score(actual, pred)) if len(actual) > 1 else None,
        "mape_percent": float(np.mean(np.abs((actual - pred) / actual)) * 100) if np.all(actual != 0) else None,
        "baseline": {
            "name": "Seasonal naive (previous week)",
            "mae": float(mean_absolute_error(actual, baseline)),
            "rmse": float(np.sqrt(mean_squared_error(actual, baseline))),
        },
    }
    predictions = [
        {"date": d.strftime("%Y-%m-%d"), "actual": float(a), "predicted": float(p), "residual": float(a - p)}
        for d, a, p in zip(test.index, actual, pred)
    ]
    return metrics, predictions


def validate_forecast_date(forecast_date: date, last_date: date, horizon_days: int = 180):
    if forecast_date <= last_date:
        raise HTTPException(status_code=400, detail=f"Choose a date after the latest usable date in this selection ({last_date.isoformat()}).")
    if forecast_date > last_date + timedelta(days=horizon_days):
        raise HTTPException(status_code=400, detail=f"Choose a date within the next {horizon_days} days. Longer-range predictions are too uncertain for this prototype.")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "DemandX API", "google_login_configured": bool(GOOGLE_CLIENT_ID)}

@app.get("/api/me")
def me(user=Depends(current_user)):
    profile_path = user_root(user) / "profile.json"
    profile = json.loads(profile_path.read_text(encoding="utf-8")) if profile_path.exists() else {}
    return {
        "id": user["sub"],
        "email": user["email"],
        "name": profile.get("display_name") or user["name"],
        "picture": user["picture"],
        "organization": profile.get("organization", ""),
    }

@app.put("/api/me")
def update_me(request: ProfileUpdate, user=Depends(current_user)):
    display_name = request.display_name.strip()
    if not display_name:
        raise HTTPException(status_code=422, detail="Display name cannot be empty.")
    profile = {"display_name": display_name, "organization": request.organization.strip()}
    (user_root(user) / "profile.json").write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
    return me(user)

@app.get("/api/datasets")
def list_datasets(user=Depends(current_user)):
    items = []
    for meta_path in (user_root(user) / "datasets").glob("*/meta.json"):
        try:
            meta = read_meta(meta_path)
            items.append({k: meta.get(k) for k in ["id", "filename", "rows", "columns_count", "created_at", "date_col", "target_col", "product_col"]})
        except Exception:
            continue
    return sorted(items, key=lambda x: x.get("created_at") or "", reverse=True)

@app.post("/api/datasets")
async def upload_dataset(file: UploadFile = File(...), user=Depends(current_user)):
    filename = file.filename or "upload.csv"
    ext = Path(filename).suffix.lower()
    if ext not in {".csv", ".xlsx", ".xls"}: raise HTTPException(status_code=415, detail="Upload a CSV, XLSX, or XLS file.")
    content = await file.read()
    if not content: raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(content) > 30 * 1024 * 1024: raise HTTPException(status_code=413, detail="File is too large. Maximum upload size is 30 MB.")
    try:
        from io import BytesIO
        df = pd.read_csv(BytesIO(content), low_memory=False) if ext == ".csv" else pd.read_excel(BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not read this file: {str(exc)[:180]}")
    if df.empty or len(df.columns) < 1: raise HTTPException(status_code=400, detail="The file has no usable rows or columns.")
    if len(df) > 500_000: raise HTTPException(status_code=413, detail="This prototype supports up to 500,000 rows per upload.")
    detected = detect_columns(df)
    dataset_id = str(uuid.uuid4())
    root = user_root(user) / "datasets" / dataset_id
    root.mkdir(parents=True, exist_ok=True)
    # Persist dates in ISO format so the CSV can be reopened consistently.
    saved = df.copy()
    if detected["date_col"]:
        saved[detected["date_col"]] = pd.to_datetime(saved[detected["date_col"]], errors="coerce").dt.strftime("%Y-%m-%d %H:%M:%S")
    saved.to_csv(root / "data.csv", index=False)
    meta = {"id": dataset_id, "filename": Path(filename).name, "rows": int(len(df)), "columns_count": int(len(df.columns)), "columns": [str(c) for c in df.columns], "created_at": datetime.utcnow().isoformat() + "Z", **detected}
    (root / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return {**meta, "preview": records(df, 8), "missing_cells": int(df.isna().sum().sum()), "duplicate_rows": int(df.duplicated().sum()), "numeric_columns": [str(c) for c in df.select_dtypes(include=np.number).columns], "message": "Dataset uploaded and saved to your workspace."}

@app.get("/api/datasets/{dataset_id}")
def dataset_profile(dataset_id: str, user=Depends(current_user)):
    df, meta, _ = load_frame(user, dataset_id)
    date_range = {}
    if meta.get("date_col") and meta["date_col"] in df.columns:
        parsed_dates = pd.to_datetime(df[meta["date_col"]], errors="coerce").dropna()
        date_range = {"date_min": parsed_dates.min().strftime("%Y-%m-%d") if len(parsed_dates) else None, "date_max": parsed_dates.max().strftime("%Y-%m-%d") if len(parsed_dates) else None}
    col_info = []
    for c in df.columns:
        vals = df[c].dropna().astype(str)
        if vals.nunique() <= 100:
            options = vals.drop_duplicates().head(100).tolist()
        else:
            options = vals.value_counts().head(100).index.tolist()
        col_info.append({"name": str(c), "dtype": str(df[c].dtype), "missing": int(df[c].isna().sum()), "unique": int(df[c].nunique(dropna=True)), "values": options})
    return {**meta, **date_range, "preview": records(df, 12), "missing_cells": int(df.isna().sum().sum()), "duplicate_rows": int(df.duplicated().sum()), "columns": col_info, "numeric_columns": [str(c) for c in df.select_dtypes(include=np.number).columns]}

@app.post("/api/datasets/{dataset_id}/clean")
def clean(dataset_id: str, request: CleanRequest, user=Depends(current_user)):
    df, meta, root = load_frame(user, dataset_id)
    require_columns(df, request.date_col, request.target_col)
    cleaned, report = clean_dataset(df, request.date_col, request.target_col)
    if request.date_col and request.date_col in cleaned.columns:
        cleaned[request.date_col] = pd.to_datetime(cleaned[request.date_col], errors="coerce").dt.strftime("%Y-%m-%d %H:%M:%S")
    cleaned.to_csv(root / "data.csv", index=False)
    meta.update({"rows": int(len(cleaned)), "columns_count": int(len(cleaned.columns)), "date_col": request.date_col, "target_col": request.target_col, "cleaned_at": datetime.utcnow().isoformat() + "Z"})
    (root / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"report": report, "preview": records(cleaned, 12), "rows": len(cleaned), "message": "Cleaning completed and saved to this dataset."}

@app.get("/api/datasets/{dataset_id}/download")
def download_dataset(dataset_id: str, user=Depends(current_user)):
    _, meta, data_path = dataset_paths(user, dataset_id)
    return Response(data_path.read_bytes(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{Path(meta.get("filename", "dataset.csv")).stem}_cleaned.csv"'})

@app.post("/api/datasets/{dataset_id}/analytics")
def analytics(dataset_id: str, request: AnalyticsRequest, user=Depends(current_user)):
    df, meta, _ = load_frame(user, dataset_id)
    require_columns(df, request.date_col, request.target_col, request.product_col)
    work = df.drop_duplicates().copy()
    work[request.date_col] = pd.to_datetime(work[request.date_col], errors="coerce")
    work[request.target_col] = pd.to_numeric(work[request.target_col], errors="coerce").replace([np.inf, -np.inf], np.nan)
    work = work.dropna(subset=[request.date_col, request.target_col])
    if work.empty: raise HTTPException(status_code=400, detail="No valid date and numeric demand rows found.")
    daily = work.groupby(work[request.date_col].dt.floor("D"))[request.target_col].sum().sort_index()
    daily = daily.reindex(pd.date_range(daily.index.min(), daily.index.max(), freq="D"), fill_value=0.0)
    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekday = daily.groupby(daily.index.day_name()).mean()
    product = []
    if request.product_col:
        product = [{"name": str(k), "demand": float(v), "measure": request.target_col} for k, v in work.groupby(request.product_col)[request.target_col].sum().sort_values(ascending=False).head(12).items()]
    vals = work[request.target_col]
    daily_distribution = daily.sample(min(len(daily), 1200), random_state=42).tolist() if len(daily) > 1200 else daily.tolist()
    return {
        "measure": request.target_col,
        "summary": {
            "rows": len(work),
            "total_demand": float(daily.sum()),
            "average_demand": float(daily.mean()),
            "peak_day": daily.idxmax().strftime("%Y-%m-%d"),
            "peak_demand": float(daily.max()),
            "date_from": daily.index.min().strftime("%Y-%m-%d"),
            "date_to": daily.index.max().strftime("%Y-%m-%d"),
            "unique_products": int(work[request.product_col].nunique()) if request.product_col else None,
            "duplicate_rows_excluded": int(df.duplicated().sum()),
        },
        "daily": [{"date": k.strftime("%Y-%m-%d"), "demand": float(v), "measure": request.target_col} for k, v in daily.items()],
        "weekday": [{"day": day, "demand": float(weekday.get(day, 0)), "measure": request.target_col} for day in weekday_order],
        "products": product,
        "distribution": [float(x) for x in daily_distribution],
    }

@app.post("/api/datasets/{dataset_id}/train")
def train(dataset_id: str, request: TrainRequest, user=Depends(current_user)):
    df, meta, _ = load_frame(user, dataset_id)
    series = daily_series(df, request.date_col, request.target_col, request.product_col, request.product_value)
    metrics, predictions = evaluate_series(series, request.model, request.target_col)
    for prediction in predictions:
        prediction["measure"] = request.target_col
    return {"model": request.model, "measure": request.target_col, "metrics": metrics, "predictions": predictions, "history_days": len(series), "test_days": len(predictions), "product": request.product_value or "All products", "message": "Evaluation used a chronological rolling one-day holdout; the model did not train on held-out target values, but observed history remains available as prior-day input during the test window. Scores may not represent multi-day recursive forecast accuracy."}

@app.post("/api/datasets/{dataset_id}/forecast")
def forecast(dataset_id: str, request: ForecastRequest, user=Depends(current_user)):
    df, meta, root = load_frame(user, dataset_id)
    series = daily_series(df, request.date_col, request.target_col, request.product_col, request.product_value)
    last_date = series.index.max().date()
    validate_forecast_date(request.forecast_date, last_date)
    if len(series) < 26:
        raise HTTPException(status_code=400, detail="At least 26 calendar days of daily history are needed to evaluate and fit this forecast. More history will usually improve reliability.")
    metrics, test_predictions = evaluate_series(series, request.model, request.target_col)
    featured = features_for_series(series)
    if len(featured) < 12: raise HTTPException(status_code=400, detail="Not enough history after preparing lag features. Add more historical data.")
    model = make_estimator(request.model)
    model.fit(featured.drop(columns="y"), featured["y"])
    working = series.copy()
    forecast_rows = []
    cursor = last_date + timedelta(days=1)
    while cursor <= request.forecast_date:
        # Build features only from observations available before the prediction date.
        history = working.copy()
        row = {"dow": cursor.weekday(), "day": cursor.day, "month": cursor.month, "year": cursor.year, "is_weekend": int(cursor.weekday() >= 5)}
        for lag in (1, 7, 14): row[f"lag_{lag}"] = float(history.iloc[-lag]) if len(history) >= lag else float(history.mean())
        row["rolling_7"] = float(history.iloc[-7:].mean())
        row["rolling_14"] = float(history.iloc[-14:].mean())
        pred = max(0.0, float(model.predict(pd.DataFrame([row]))[0]))
        if is_order_count_column(request.target_col):
            pred = float(round(pred))
        working.loc[pd.Timestamp(cursor)] = pred
        forecast_rows.append({"date": cursor.isoformat(), "demand": round(pred, 2), "measure": request.target_col})
        cursor += timedelta(days=1)
    chosen = forecast_rows[-1]
    history_path = user_root(user) / "history.json"
    try: history = json.loads(history_path.read_text(encoding="utf-8")) if history_path.exists() else []
    except Exception: history = []
    item = {"id": str(uuid.uuid4()), "dataset_id": dataset_id, "filename": meta.get("filename"), "product": request.product_value or "All products", "date": chosen["date"], "demand": chosen["demand"], "measure": request.target_col, "model": request.model, "created_at": datetime.utcnow().isoformat() + "Z"}
    for prediction in test_predictions:
        prediction["measure"] = request.target_col
    history.insert(0, item)
    history_path.write_text(json.dumps(history[:100], indent=2), encoding="utf-8")
    return {"prediction": chosen["demand"], "prediction_type": "forecast", "measure": request.target_col, "forecast_date": chosen["date"], "product": item["product"], "model": request.model, "history_start": series.index.min().strftime("%Y-%m-%d"), "history_end": last_date.isoformat(), "history_days": len(series), "evaluation": metrics, "evaluation_predictions": test_predictions, "forecast_path": forecast_rows, "explanation": "This is a forecast, not an observed actual count. The model uses calendar features and lagged demand from the selected product's history. Dates after the last observed day are predicted recursively; uncertainty grows with forecast horizon. Validation scores use a rolling one-day holdout, not a multi-day recursive holdout. No calibrated prediction interval is available.", "saved": True}

@app.get("/api/history")
def history(user=Depends(current_user)):
    path = user_root(user) / "history.json"
    if not path.exists(): return []
    try: return json.loads(path.read_text(encoding="utf-8"))
    except Exception: return []

@app.delete("/api/history/{forecast_id}")
def delete_history(forecast_id: str, user=Depends(current_user)):
    path = user_root(user) / "history.json"
    if not path.exists(): return {"deleted": False}
    items = json.loads(path.read_text(encoding="utf-8"))
    updated = [x for x in items if x.get("id") != forecast_id]
    path.write_text(json.dumps(updated, indent=2), encoding="utf-8")
    return {"deleted": len(updated) != len(items)}
