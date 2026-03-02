"""
================================================================
  DISEASE PREDICTOR - ML MODEL
  Trained on: medical_patient_dataset.csv
  Model: Random Forest Classifier (with GridSearchCV tuning)
  Input: Patient symptoms
  Output: Predicted disease + confidence score
================================================================
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import (
    classification_report, confusion_matrix,
    accuracy_score, f1_score
)
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────
DATASET_PATH = "medical_patient_dataset.csv"
MODEL_SAVE_PATH = "disease_predictor_model.pkl"
ENCODER_SAVE_PATH = "disease_label_encoder.pkl"
MLB_SAVE_PATH = "symptom_mlb.pkl"
TEST_SIZE = 0.2
RANDOM_STATE = 42


# ─────────────────────────────────────────────
#  1. LOAD & PREPROCESS DATA
# ─────────────────────────────────────────────
def load_and_preprocess(path):
    print("\n📂 Loading dataset...")
    df = pd.read_csv(path)
    print(f"   ✔ Loaded {len(df)} records with {df.shape[1]} columns")

    # Parse symptoms into list
    df["Symptoms_List"] = df["Symptoms"].apply(
        lambda x: [s.strip() for s in x.split(",")]
    )

    # Encode target (disease)
    le = LabelEncoder()
    df["Disease_Encoded"] = le.fit_transform(df["Predicted_Disease"])

    print(f"   ✔ Total unique diseases: {len(le.classes_)}")
    print(f"   ✔ Diseases: {list(le.classes_)}")

    # Multi-label binarize symptoms
    mlb = MultiLabelBinarizer()
    X_symptoms = mlb.fit_transform(df["Symptoms_List"])
    print(f"   ✔ Total unique symptoms (features): {len(mlb.classes_)}")

    # Additional features: Age, Gender, Blood_Group
    age = df["Age"].values.reshape(-1, 1)
    gender_enc = pd.get_dummies(df["Gender"], prefix="Gender").values
    blood_enc = pd.get_dummies(df["Blood_Group"], prefix="BG").values

    X = np.hstack([X_symptoms, age, gender_enc, blood_enc])
    y = df["Disease_Encoded"].values

    return X, y, le, mlb, df


# ─────────────────────────────────────────────
#  2. TRAIN MODEL
# ─────────────────────────────────────────────
def train_model(X_train, y_train):
    print("\n🔧 Training Random Forest Classifier...")

    param_grid = {
        "n_estimators": [100, 200],
        "max_depth": [None, 20, 30],
        "min_samples_split": [2, 5],
        "class_weight": ["balanced"]
    }

    rf = RandomForestClassifier(random_state=RANDOM_STATE)
    grid_search = GridSearchCV(
        rf, param_grid, cv=5,
        scoring="f1_weighted", n_jobs=-1, verbose=1
    )
    grid_search.fit(X_train, y_train)

    best_model = grid_search.best_estimator_
    print(f"   ✔ Best params: {grid_search.best_params_}")
    print(f"   ✔ Best CV F1 score: {grid_search.best_score_:.4f}")
    return best_model


# ─────────────────────────────────────────────
#  3. EVALUATE MODEL
# ─────────────────────────────────────────────
def evaluate_model(model, X_test, y_test, le):
    print("\n📊 Evaluating model on test set...")
    y_pred = model.predict(X_test)

    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="weighted")

    print(f"   ✔ Accuracy      : {acc * 100:.2f}%")
    print(f"   ✔ F1 Score (W)  : {f1:.4f}")
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Top feature importances (symptom-based)
    feature_importances = model.feature_importances_
    top_indices = np.argsort(feature_importances)[::-1][:10]
    print("\n🔍 Top 10 Most Important Features (by index):")
    for idx in top_indices:
        print(f"   Feature[{idx}]: importance = {feature_importances[idx]:.4f}")


# ─────────────────────────────────────────────
#  4. SAVE MODEL
# ─────────────────────────────────────────────
def save_artifacts(model, le, mlb):
    joblib.dump(model, MODEL_SAVE_PATH)
    joblib.dump(le, ENCODER_SAVE_PATH)
    joblib.dump(mlb, MLB_SAVE_PATH)
    print(f"\n💾 Model saved   → {MODEL_SAVE_PATH}")
    print(f"💾 Encoder saved → {ENCODER_SAVE_PATH}")
    print(f"💾 MLB saved     → {MLB_SAVE_PATH}")


# ─────────────────────────────────────────────
#  5. PREDICT FUNCTION (for app integration)
# ─────────────────────────────────────────────
def predict_disease(symptoms: list, age: int = 30, gender: str = "Male", blood_group: str = "O+"):
    """
    Predict disease from given symptoms.

    Parameters:
        symptoms   (list): e.g. ["Fever", "Cough", "Fatigue"]
        age        (int) : Patient age
        gender     (str) : 'Male', 'Female', or 'Other'
        blood_group(str) : e.g. 'O+', 'A-', etc.

    Returns:
        dict: {
            'predicted_disease': str,
            'confidence': float,
            'top_3_predictions': list of (disease, probability)
        }
    """
    model = joblib.load(MODEL_SAVE_PATH)
    le    = joblib.load(ENCODER_SAVE_PATH)
    mlb   = joblib.load(MLB_SAVE_PATH)

    # Build feature vector
    symptoms_clean = [s.strip() for s in symptoms]
    X_sym = mlb.transform([symptoms_clean])

    age_arr     = np.array([[age]])
    gender_dummies = {"Male": [1, 0, 0], "Female": [0, 1, 0], "Other": [0, 0, 1]}
    gender_arr  = np.array([gender_dummies.get(gender, [0, 0, 1])])
    bg_options  = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"]
    bg_arr      = np.array([[1 if b == blood_group else 0 for b in bg_options]])

    X = np.hstack([X_sym, age_arr, gender_arr, bg_arr])

    proba   = model.predict_proba(X)[0]
    top3_idx = np.argsort(proba)[::-1][:3]

    return {
        "predicted_disease": le.inverse_transform([top3_idx[0]])[0],
        "confidence": round(proba[top3_idx[0]] * 100, 2),
        "top_3_predictions": [
            (le.inverse_transform([i])[0], round(proba[i] * 100, 2))
            for i in top3_idx
        ]
    }


# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  DISEASE PREDICTOR - TRAINING PIPELINE")
    print("=" * 60)

    # Step 1: Load data
    X, y, le, mlb, df = load_and_preprocess(DATASET_PATH)

    # Step 2: Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"\n🔀 Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    # Step 3: Train
    model = train_model(X_train, y_train)

    # Step 4: Evaluate
    evaluate_model(model, X_test, y_test, le)

    # Step 5: Save
    save_artifacts(model, le, mlb)

    # Step 6: Demo prediction
    print("\n" + "=" * 60)
    print("  DEMO PREDICTION")
    print("=" * 60)
    test_symptoms = ["Fever", "Cough", "Fatigue", "Body Ache"]
    result = predict_disease(test_symptoms, age=28, gender="Male", blood_group="B+")
    print(f"\n  Input Symptoms : {test_symptoms}")
    print(f"  Predicted Disease : {result['predicted_disease']}")
    print(f"  Confidence        : {result['confidence']}%")
    print(f"  Top 3 Predictions :")
    for disease, prob in result["top_3_predictions"]:
        print(f"    → {disease}: {prob}%")

    print("\n✅ Disease Predictor training complete!")