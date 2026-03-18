"""
╔══════════════════════════════════════════════════════════════════╗
║          MEDIPREDICT — DISEASE PREDICTION ENGINE v2.0           ║
║──────────────────────────────────────────────────────────────────║
║  Dataset   : medical_patient_dataset.csv                        ║
║  Algorithm : Ensemble (Random Forest + Gradient Boosting + SVM) ║
║  Features  : Symptoms · Age · Gender · Blood Group              ║
║  Output    : Disease · Confidence · Top-5 · Risk Level          ║
╚══════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import time
import logging
import warnings
import hashlib
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer, StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, f1_score, precision_score, recall_score
)
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV

warnings.filterwarnings("ignore")

# ══════════════════════════════════════════════════════════════════
#  LOGGING SETUP
# ══════════════════════════════════════════════════════════════════
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_DIR / "disease_predictor.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("DiseasePredictor")

# ══════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════
BASE_DIR          = Path(__file__).parent
DATASET_PATH      = BASE_DIR / "medical_patient_dataset.csv"
MODEL_DIR         = BASE_DIR / "artifacts"
MODEL_DIR.mkdir(exist_ok=True)

MODEL_SAVE_PATH   = MODEL_DIR / "disease_predictor_model.pkl"
ENCODER_SAVE_PATH = MODEL_DIR / "disease_label_encoder.pkl"
MLB_SAVE_PATH     = MODEL_DIR / "symptom_mlb.pkl"
SCALER_SAVE_PATH  = MODEL_DIR / "feature_scaler.pkl"
META_SAVE_PATH    = MODEL_DIR / "model_metadata.json"

TEST_SIZE         = 0.20
RANDOM_STATE      = 42
CV_FOLDS          = 5

# Risk classification thresholds
RISK_LEVELS = {
    "Critical":  ["Appendicitis", "Pneumonia", "Malaria", "Dengue", "Kidney Stone"],
    "High":      ["Diabetes", "Hypertension", "Thyroid Disorder", "Asthma"],
    "Moderate":  ["Arthritis", "Migraine", "UTI", "Typhoid", "Flu"],
    "Low":       ["Gastritis", "Anemia", "Skin Allergy", "Conjunctivitis",
                  "Depression", "Anxiety Disorder"],
}

DISEASE_RISK_MAP = {
    disease: level
    for level, diseases in RISK_LEVELS.items()
    for disease in diseases
}

# Additional disease metadata
DISEASE_META = {
    "Flu":              {"icon": "🤒", "urgency": "Non-urgent",  "icd10": "J10"},
    "Diabetes":         {"icon": "🩺", "urgency": "Urgent",      "icd10": "E11"},
    "Hypertension":     {"icon": "❤️", "urgency": "Urgent",      "icd10": "I10"},
    "Asthma":           {"icon": "🫁", "urgency": "Semi-urgent", "icd10": "J45"},
    "Malaria":          {"icon": "🦟", "urgency": "Urgent",      "icd10": "B54"},
    "Dengue":           {"icon": "🦟", "urgency": "Urgent",      "icd10": "A90"},
    "Typhoid":          {"icon": "🌡️", "urgency": "Urgent",      "icd10": "A01"},
    "Pneumonia":        {"icon": "🫁", "urgency": "Critical",    "icd10": "J18"},
    "Migraine":         {"icon": "🧠", "urgency": "Non-urgent",  "icd10": "G43"},
    "Arthritis":        {"icon": "🦴", "urgency": "Semi-urgent", "icd10": "M06"},
    "Gastritis":        {"icon": "🫃", "urgency": "Non-urgent",  "icd10": "K29"},
    "Anemia":           {"icon": "🩸", "urgency": "Semi-urgent", "icd10": "D64"},
    "UTI":              {"icon": "🏥", "urgency": "Semi-urgent", "icd10": "N39"},
    "Depression":       {"icon": "🧠", "urgency": "Semi-urgent", "icd10": "F32"},
    "Anxiety Disorder": {"icon": "😰", "urgency": "Non-urgent",  "icd10": "F41"},
    "Skin Allergy":     {"icon": "🌸", "urgency": "Non-urgent",  "icd10": "L50"},
    "Conjunctivitis":   {"icon": "👁️", "urgency": "Non-urgent",  "icd10": "H10"},
    "Kidney Stone":     {"icon": "🪨", "urgency": "Critical",    "icd10": "N20"},
    "Appendicitis":     {"icon": "🚨", "urgency": "Critical",    "icd10": "K37"},
    "Thyroid Disorder": {"icon": "🦋", "urgency": "Urgent",      "icd10": "E07"},
}


# ══════════════════════════════════════════════════════════════════
#  PROGRESS BAR HELPER
# ══════════════════════════════════════════════════════════════════
def _progress(label: str, current: int, total: int, width: int = 40):
    """Render an ASCII progress bar."""
    pct   = current / total
    done  = int(width * pct)
    bar   = "█" * done + "░" * (width - done)
    print(f"\r  {label}: [{bar}] {pct*100:5.1f}%", end="", flush=True)
    if current == total:
        print()


def _banner(title: str, width: int = 66):
    border = "═" * width
    pad    = (width - len(title) - 2) // 2
    print(f"\n╔{border}╗")
    print(f"║{' ' * pad} {title} {' ' * (width - pad - len(title) - 1)}║")
    print(f"╚{border}╝\n")


def _section(title: str):
    print(f"\n  ┌─ {title} {'─' * (58 - len(title))}┐")


def _end_section():
    print(f"  └{'─' * 62}┘")


# ══════════════════════════════════════════════════════════════════
#  1. LOAD & PREPROCESS DATA
# ══════════════════════════════════════════════════════════════════
def load_and_preprocess(path: Path):
    _section("STEP 1 — Data Loading & Preprocessing")
    logger.info(f"Loading dataset from: {path}")

    if not path.exists():
        logger.critical(f"Dataset not found at: {path}")
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path)
    logger.info(f"Loaded {len(df):,} records | {df.shape[1]} columns")

    # ── Missing value summary ──────────────────────────────────
    missing = df.isnull().sum()
    if missing.any():
        logger.warning(f"Missing values detected:\n{missing[missing > 0]}")
        df = df.fillna({"Age": df["Age"].median(), "Gender": "Other",
                        "Blood_Group": "O+", "Patient_Satisfaction_Rating": 4.0})

    # ── Age range validation ───────────────────────────────────
    df["Age"] = df["Age"].clip(0, 120)

    # ── Parse symptoms ─────────────────────────────────────────
    df["Symptoms_List"] = df["Symptoms"].apply(
        lambda x: [s.strip().title() for s in str(x).split(",")]
    )

    # ── Encode target (disease) ────────────────────────────────
    le = LabelEncoder()
    df["Disease_Encoded"] = le.fit_transform(df["Predicted_Disease"])

    # ── Multi-label binarize symptoms ──────────────────────────
    mlb = MultiLabelBinarizer()
    X_symptoms = mlb.fit_transform(df["Symptoms_List"])

    # ── Numeric & categorical features ────────────────────────
    age       = df["Age"].values.reshape(-1, 1)
    gender_enc = pd.get_dummies(df["Gender"], prefix="Gender").values
    blood_enc  = pd.get_dummies(df["Blood_Group"], prefix="BG").values

    X = np.hstack([X_symptoms, age, gender_enc, blood_enc])
    y = df["Disease_Encoded"].values

    # ── Dataset fingerprint for cache validation ───────────────
    fingerprint = hashlib.md5(df.to_csv(index=False).encode()).hexdigest()[:8]

    print(f"  │  ✔ Records loaded       : {len(df):,}")
    print(f"  │  ✔ Unique diseases      : {len(le.classes_)}")
    print(f"  │  ✔ Unique symptoms      : {len(mlb.classes_)}")
    print(f"  │  ✔ Feature dimensions   : {X.shape[1]}")
    print(f"  │  ✔ Dataset fingerprint  : {fingerprint}")
    _end_section()

    return X, y, le, mlb, df, fingerprint


# ══════════════════════════════════════════════════════════════════
#  2. TRAIN ENSEMBLE MODEL
# ══════════════════════════════════════════════════════════════════
def train_model(X_train, y_train):
    _section("STEP 2 — Model Training (Ensemble Voting Classifier)")
    logger.info("Initialising ensemble of RF + GBM + Calibrated SVM...")

    start = time.time()

    # — Random Forest ─────────────────────────────────────────
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )

    # — Gradient Boosting ──────────────────────────────────────
    gbm = GradientBoostingClassifier(
        n_estimators=150,
        learning_rate=0.1,
        max_depth=5,
        subsample=0.8,
        random_state=RANDOM_STATE
    )

    # — Calibrated SVM (for probability estimates) ─────────────
    svm_base = SVC(kernel="rbf", C=10, gamma="scale", probability=False,
                   class_weight="balanced", random_state=RANDOM_STATE)
    svm_cal  = CalibratedClassifierCV(svm_base, cv=3, method="isotonic")

    # — Soft Voting Ensemble ───────────────────────────────────
    ensemble = VotingClassifier(
        estimators=[
            ("rf",  rf),
            ("gbm", gbm),
            ("svm", svm_cal)
        ],
        voting="soft",
        weights=[3, 2, 1],      # RF gets most weight
        n_jobs=-1
    )

    print("  │  Training ensemble (RF + GBM + SVM) — this may take 2-4 min...")
    ensemble.fit(X_train, y_train)

    elapsed = time.time() - start
    logger.info(f"Training complete in {elapsed:.1f}s")
    print(f"  │  ✔ Training time        : {elapsed:.1f}s")
    _end_section()

    return ensemble


# ══════════════════════════════════════════════════════════════════
#  3. CROSS-VALIDATE + EVALUATE
# ══════════════════════════════════════════════════════════════════
def evaluate_model(model, X_train, X_test, y_test, le):
    _section("STEP 3 — Model Evaluation")
    logger.info("Running evaluation on hold-out test set...")

    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    acc  = accuracy_score(y_test, y_pred)
    f1   = f1_score(y_test, y_pred, average="weighted")
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec  = recall_score(y_test, y_pred, average="weighted", zero_division=0)

    # ── Cross-validation on training set ──────────────────────
    print("  │  Running 5-fold CV (RF base estimator)...")
    rf_base = model.estimators_[0]
    cv      = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    cv_f1   = cross_val_score(rf_base, X_train, y_train[:len(X_train)],
                               cv=cv, scoring="f1_weighted", n_jobs=-1)

    print(f"\n  │  ── Hold-out Test Set Metrics ──")
    print(f"  │  ✔ Accuracy            : {acc  * 100:6.2f}%")
    print(f"  │  ✔ F1 Score (weighted) : {f1:8.4f}")
    print(f"  │  ✔ Precision (weighted): {prec:8.4f}")
    print(f"  │  ✔ Recall (weighted)   : {rec:8.4f}")
    print(f"\n  │  ── Cross-Validation (RF, 5-Fold) ──")
    print(f"  │  ✔ CV F1 Mean          : {cv_f1.mean():.4f}")
    print(f"  │  ✔ CV F1 Std           : {cv_f1.std():.4f}")
    print(f"  │  ✔ CV F1 Range         : [{cv_f1.min():.4f} — {cv_f1.max():.4f}]")

    print(f"\n  │  ── Per-Class Report ──")
    report = classification_report(y_test, y_pred, target_names=le.classes_, output_dict=True)
    for cls in le.classes_:
        r = report.get(cls, {})
        bar = "█" * int(r.get("f1-score", 0) * 20)
        print(f"  │  {cls:<22} F1={r.get('f1-score', 0):.2f} [{bar:<20}]")

    # ── Feature importance (from RF estimator) ────────────────
    rf_estimator = model.estimators_[0]
    importances  = rf_estimator.feature_importances_
    top10        = np.argsort(importances)[::-1][:10]
    print(f"\n  │  ── Top 10 Feature Importances ──")
    for rank, idx in enumerate(top10, 1):
        bar = "█" * int(importances[idx] * 200)
        print(f"  │  [{rank:2d}] Feature[{idx:3d}]: {importances[idx]:.4f} {bar}")

    _end_section()
    logger.info(f"Evaluation done — Accuracy={acc*100:.2f}%, F1={f1:.4f}")

    return {
        "accuracy_%":         round(acc  * 100, 4),
        "f1_weighted":        round(f1,          4),
        "precision_weighted": round(prec,         4),
        "recall_weighted":    round(rec,          4),
        "cv_f1_mean":         round(cv_f1.mean(), 4),
        "cv_f1_std":          round(cv_f1.std(),  4),
    }


# ══════════════════════════════════════════════════════════════════
#  4. SAVE ARTIFACTS + METADATA
# ══════════════════════════════════════════════════════════════════
def save_artifacts(model, le, mlb, metrics: dict, fingerprint: str):
    _section("STEP 4 — Saving Artifacts")
    logger.info("Persisting model artifacts...")

    joblib.dump(model, MODEL_SAVE_PATH, compress=3)
    joblib.dump(le,    ENCODER_SAVE_PATH)
    joblib.dump(mlb,   MLB_SAVE_PATH)

    metadata = {
        "model_version":        "2.0",
        "trained_at":           datetime.now().isoformat(),
        "algorithm":            "Ensemble (RF + GBM + SVM)",
        "dataset_fingerprint":  fingerprint,
        "n_classes":            len(le.classes_),
        "n_symptoms":           len(mlb.classes_),
        "diseases":             le.classes_.tolist(),
        "metrics":              metrics,
        "artifacts": {
            "model":   str(MODEL_SAVE_PATH),
            "encoder": str(ENCODER_SAVE_PATH),
            "mlb":     str(MLB_SAVE_PATH),
        }
    }
    META_SAVE_PATH.write_text(json.dumps(metadata, indent=2))

    sizes = {
        "Model":   os.path.getsize(MODEL_SAVE_PATH),
        "Encoder": os.path.getsize(ENCODER_SAVE_PATH),
        "MLB":     os.path.getsize(MLB_SAVE_PATH),
        "Meta":    os.path.getsize(META_SAVE_PATH),
    }
    for name, sz in sizes.items():
        print(f"  │  💾  {name:<10} → {MODEL_DIR.name}/{name.lower()}.pkl  ({sz/1024:.1f} KB)")
    _end_section()
    logger.info("All artifacts saved successfully.")


# ══════════════════════════════════════════════════════════════════
#  5. PREDICT FUNCTION  (real-time API integration)
# ══════════════════════════════════════════════════════════════════
def predict_disease(
    symptoms:     list,
    age:          int  = 30,
    gender:       str  = "Male",
    blood_group:  str  = "O+",
    top_n:        int  = 5
) -> dict:
    """
    Predict disease from patient symptoms using the trained ensemble.

    Parameters
    ----------
    symptoms    : list[str]  — e.g. ["Fever", "Cough", "Fatigue"]
    age         : int        — Patient age (0–120)
    gender      : str        — 'Male' | 'Female' | 'Other'
    blood_group : str        — 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
    top_n       : int        — Number of top predictions to return (default=5)

    Returns
    -------
    dict with keys:
        predicted_disease, confidence_pct, risk_level, urgency,
        icd10_code, top_n_predictions, model_version, predicted_at
    """
    # ── Load artifacts ─────────────────────────────────────────
    if not MODEL_SAVE_PATH.exists():
        raise FileNotFoundError(
            f"Model not found at {MODEL_SAVE_PATH}. Run disease_predictor.py first."
        )

    model = joblib.load(MODEL_SAVE_PATH)
    le    = joblib.load(ENCODER_SAVE_PATH)
    mlb   = joblib.load(MLB_SAVE_PATH)

    # ── Input validation & normalisation ──────────────────────
    age = max(0, min(120, int(age)))
    symptoms_clean   = [s.strip().title() for s in symptoms if s.strip()]
    known_symptoms   = set(mlb.classes_)
    valid_symptoms   = [s for s in symptoms_clean if s in known_symptoms]
    unknown_symptoms = [s for s in symptoms_clean if s not in known_symptoms]

    if not valid_symptoms:
        return {
            "error":            "None of the provided symptoms are recognised.",
            "unknown_symptoms": unknown_symptoms,
            "hint":             "Retrieve valid symptoms from GET /api/symptoms"
        }

    # ── Build feature vector ───────────────────────────────────
    X_sym = mlb.transform([valid_symptoms])

    age_arr    = np.array([[age]])
    gender_map = {"Male": [1, 0, 0], "Female": [0, 1, 0], "Other": [0, 0, 1]}
    gender_arr = np.array([gender_map.get(gender, [0, 0, 1])])
    bg_options = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"]
    bg_arr     = np.array([[1 if b == blood_group else 0 for b in bg_options]])

    X = np.hstack([X_sym, age_arr, gender_arr, bg_arr])

    # ── Inference ─────────────────────────────────────────────
    proba      = model.predict_proba(X)[0]
    top_n      = min(top_n, len(proba))
    sorted_idx = np.argsort(proba)[::-1][:top_n]

    predicted   = le.inverse_transform([sorted_idx[0]])[0]
    confidence  = round(float(proba[sorted_idx[0]]) * 100, 2)
    risk_level  = DISEASE_RISK_MAP.get(predicted, "Unknown")
    meta        = DISEASE_META.get(predicted, {})

    # ── Load model metadata for versioning ────────────────────
    model_version = "2.0"
    if META_SAVE_PATH.exists():
        with open(META_SAVE_PATH) as f:
            model_version = json.load(f).get("model_version", "2.0")

    return {
        "predicted_disease":  predicted,
        "confidence_pct":     confidence,
        "risk_level":         risk_level,
        "urgency":            meta.get("urgency", "Consult doctor"),
        "icd10_code":         meta.get("icd10", "N/A"),
        "disease_icon":       meta.get("icon", "🏥"),
        "valid_symptoms":     valid_symptoms,
        "unknown_symptoms":   unknown_symptoms,
        "symptom_match_rate": f"{len(valid_symptoms)}/{len(symptoms_clean)} recognised",
        "top_predictions": [
            {
                "rank":        rank + 1,
                "disease":     le.inverse_transform([i])[0],
                "probability": round(float(proba[i]) * 100, 2),
                "risk_level":  DISEASE_RISK_MAP.get(
                    le.inverse_transform([i])[0], "Unknown"
                ),
            }
            for rank, i in enumerate(sorted_idx)
        ],
        "model_version": model_version,
        "predicted_at":  datetime.now().isoformat(),
        "disclaimer":    (
            "⚠️  This is an AI-based prediction for informational purposes only. "
            "Always consult a qualified healthcare professional for diagnosis and treatment."
        )
    }


# ══════════════════════════════════════════════════════════════════
#  MAIN — TRAINING PIPELINE
# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    _banner("MEDIPREDICT — DISEASE PREDICTOR  v2.0")
    logger.info("=" * 64)
    logger.info("Starting Disease Predictor training pipeline")
    logger.info("=" * 64)

    pipeline_start = time.time()

    # ── Step 1: Load ───────────────────────────────────────────
    X, y, le, mlb, df, fingerprint = load_and_preprocess(DATASET_PATH)

    # ── Step 2: Train/test split ───────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"\n  🔀 Split  →  Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    # ── Step 3: Train ──────────────────────────────────────────
    model = train_model(X_train, y_train)

    # ── Step 4: Evaluate ───────────────────────────────────────
    metrics = evaluate_model(model, X_train, X_test, y_test, le)

    # ── Step 5: Save ───────────────────────────────────────────
    save_artifacts(model, le, mlb, metrics, fingerprint)

    # ── Step 6: Live Demo Prediction ──────────────────────────
    _banner("LIVE DEMO PREDICTION")
    test_cases = [
        {"symptoms": ["Fever", "Cough", "Fatigue", "Body Ache"], "age": 28,
         "gender": "Male",   "blood_group": "B+"},
        {"symptoms": ["Frequent Urination", "Fatigue", "Blurred Vision"], "age": 52,
         "gender": "Female", "blood_group": "A+"},
        {"symptoms": ["Chest Pain", "Shortness Of Breath", "Sweating"], "age": 60,
         "gender": "Male",   "blood_group": "O-"},
    ]

    for i, case in enumerate(test_cases, 1):
        print(f"  ─── Test Case {i} {'─'*50}")
        t0     = time.time()
        result = predict_disease(**case)
        latency = (time.time() - t0) * 1000

        if "error" in result:
            print(f"  ⚠  Error: {result['error']}")
            continue

        icon = result["disease_icon"]
        print(f"  {icon}  Predicted  : {result['predicted_disease']}")
        print(f"  📊 Confidence : {result['confidence_pct']}%")
        print(f"  🚨 Risk Level : {result['risk_level']}")
        print(f"  ⏱  Urgency    : {result['urgency']}")
        print(f"  🏷  ICD-10    : {result['icd10_code']}")
        print(f"  ⚡ Latency    : {latency:.1f} ms")
        print(f"  📋 Top Predictions:")
        for pred in result["top_predictions"][:3]:
            bar = "█" * int(pred["probability"] / 5)
            print(f"       #{pred['rank']}  {pred['disease']:<22} "
                  f"{pred['probability']:5.1f}%  {bar}")
        print()

    total = time.time() - pipeline_start
    _banner(f"PIPELINE COMPLETE  ✅  ({total:.1f}s total)")
    logger.info(f"Full training pipeline completed in {total:.1f}s")