"""
================================================================
  trainer.py
  Unified Training Pipeline
  ─────────────────────────────────────────────────────────────
  Trains TWO models from medical_patient_dataset.csv:
    1. Disease Predictor       → RandomForest + GridSearchCV
    2. Specialist Recommender  → RandomForest (CV-tuned)
  Also builds:
    - Doctor Profiles          → Rating + booking stats per doctor
    - Symptom MLB / Encoders   → Saved as .pkl for app.py
  ─────────────────────────────────────────────────────────────
  Usage:
      python trainer.py
      python trainer.py --data path/to/dataset.csv
================================================================
"""

import argparse
import os
import json
import warnings
import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.metrics import accuracy_score, f1_score, classification_report

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────
#  PATHS
# ─────────────────────────────────────────────────────────────
ARTIFACTS = {
    "disease_model":      "disease_predictor_model.pkl",
    "disease_le":         "disease_label_encoder.pkl",
    "symptom_mlb":        "symptom_mlb.pkl",
    "specialist_model":   "specialist_recommender_model.pkl",
    "specialist_le":      "specialist_label_encoder.pkl",
    "disease_le_rec":     "disease_le_for_recommender.pkl",
    "symptom_mlb_rec":    "symptom_mlb_recommender.pkl",
    "doctor_profiles":    "doctor_profiles.pkl",
    "training_report":    "training_report.json",
}

RANDOM_STATE = 42
TEST_SIZE    = 0.2

# ─────────────────────────────────────────────────────────────
#  MEDICATION DATABASE
# ─────────────────────────────────────────────────────────────
MEDICATION_DB = {
    "Flu":              {"medications": ["Paracetamol 500mg", "Oseltamivir (Tamiflu) 75mg", "Cetirizine 10mg", "Ibuprofen 400mg"],
                         "dosage": "Paracetamol 500mg every 6 hrs | Tamiflu 75mg twice daily for 5 days",
                         "precautions": "Rest, stay hydrated, avoid cold exposure", "duration": "5–7 days"},
    "Diabetes":         {"medications": ["Metformin 500mg", "Glipizide 5mg", "Insulin (if required)", "Vitamin B12 500mcg"],
                         "dosage": "Metformin 500mg twice daily with meals",
                         "precautions": "Monitor blood sugar daily, low-sugar diet, regular exercise", "duration": "Lifelong management"},
    "Hypertension":     {"medications": ["Amlodipine 5mg", "Losartan 50mg", "Hydrochlorothiazide 25mg", "Atenolol 50mg"],
                         "dosage": "Amlodipine 5mg once daily | Losartan 50mg once daily",
                         "precautions": "Low-sodium diet, no smoking, reduce stress, monitor BP regularly", "duration": "Lifelong management"},
    "Asthma":           {"medications": ["Salbutamol Inhaler (100mcg)", "Budesonide Inhaler (200mcg)", "Montelukast 10mg", "Prednisolone 5mg (acute)"],
                         "dosage": "Salbutamol 2 puffs as needed | Budesonide 1 puff twice daily",
                         "precautions": "Avoid triggers (dust, smoke, pollen), always carry inhaler", "duration": "Ongoing management"},
    "Malaria":          {"medications": ["Artemether-Lumefantrine (80/480mg)", "Chloroquine 250mg", "Primaquine 15mg", "Paracetamol 500mg"],
                         "dosage": "Artemether-Lumefantrine: 4 tablets twice daily for 3 days",
                         "precautions": "Complete full course, use mosquito nets, stay hydrated", "duration": "3–7 days"},
    "Dengue":           {"medications": ["Paracetamol 500mg", "Oral Rehydration Salts (ORS)", "Vitamin C 500mg"],
                         "dosage": "Paracetamol 500mg every 6 hrs (avoid NSAIDs/Aspirin)",
                         "precautions": "Avoid Ibuprofen/Aspirin, rest, monitor platelet count daily", "duration": "7–10 days"},
    "Typhoid":          {"medications": ["Azithromycin 500mg", "Ciprofloxacin 500mg", "Cefixime 200mg", "ORS"],
                         "dosage": "Azithromycin 500mg once daily for 7 days",
                         "precautions": "Boiled/safe water only, avoid outside food, maintain hygiene", "duration": "7–14 days"},
    "Pneumonia":        {"medications": ["Amoxicillin 500mg", "Azithromycin 500mg", "Cough syrup (Dextromethorphan)", "Paracetamol 500mg"],
                         "dosage": "Amoxicillin 500mg three times daily for 7 days",
                         "precautions": "Rest, deep breathing exercises, stay warm, stay hydrated", "duration": "7–14 days"},
    "Migraine":         {"medications": ["Sumatriptan 50mg", "Ibuprofen 400mg", "Topiramate 25mg (preventive)", "Amitriptyline 10mg"],
                         "dosage": "Sumatriptan 50mg at onset; may repeat after 2 hours",
                         "precautions": "Avoid triggers (light, stress, certain foods), rest in dark room", "duration": "Per episode; preventive therapy ongoing"},
    "Arthritis":        {"medications": ["Ibuprofen 400mg", "Methotrexate 7.5mg", "Hydroxychloroquine 200mg", "Diclofenac gel 1%"],
                         "dosage": "Ibuprofen 400mg three times daily with food",
                         "precautions": "Physiotherapy, gentle exercise, avoid joint strain", "duration": "Lifelong management"},
    "Gastritis":        {"medications": ["Omeprazole 20mg", "Pantoprazole 40mg", "Antacid (Gelusil/Digene)", "Domperidone 10mg"],
                         "dosage": "Omeprazole 20mg once daily before breakfast",
                         "precautions": "Avoid spicy/oily food, alcohol, coffee; eat small frequent meals", "duration": "2–4 weeks"},
    "Anemia":           {"medications": ["Ferrous Sulfate 200mg", "Folic Acid 5mg", "Vitamin B12 1000mcg (injection)", "Vitamin C 500mg"],
                         "dosage": "Ferrous Sulfate 200mg twice daily with Vitamin C",
                         "precautions": "Iron-rich diet (spinach, lentils, red meat), avoid tea/coffee with meals", "duration": "3–6 months"},
    "UTI":              {"medications": ["Nitrofurantoin 100mg", "Trimethoprim 200mg", "Ciprofloxacin 250mg", "Cranberry supplements"],
                         "dosage": "Nitrofurantoin 100mg twice daily for 5 days",
                         "precautions": "Drink 2–3L water daily, maintain hygiene, urinate after intercourse", "duration": "5–7 days"},
    "Depression":       {"medications": ["Sertraline 50mg", "Fluoxetine 20mg", "Escitalopram 10mg", "Clonazepam 0.5mg (if needed)"],
                         "dosage": "Sertraline 50mg once daily (morning)",
                         "precautions": "Do not stop suddenly; therapy (CBT) strongly recommended alongside medication", "duration": "6–12 months or as advised"},
    "Anxiety Disorder": {"medications": ["Buspirone 10mg", "Sertraline 50mg", "Alprazolam 0.25mg (short-term)", "Propranolol 10mg"],
                         "dosage": "Buspirone 10mg twice daily | Alprazolam only as needed",
                         "precautions": "Cognitive behavioral therapy (CBT) recommended, avoid caffeine", "duration": "6–12 months"},
    "Skin Allergy":     {"medications": ["Cetirizine 10mg", "Loratadine 10mg", "Hydrocortisone cream 1%", "Calamine lotion"],
                         "dosage": "Cetirizine 10mg once daily at night",
                         "precautions": "Identify and avoid allergens, use hypoallergenic products", "duration": "1–2 weeks"},
    "Conjunctivitis":   {"medications": ["Ciprofloxacin eye drops 0.3%", "Olopatadine eye drops 0.1%", "Artificial tears", "Tobramycin ointment 0.3%"],
                         "dosage": "Ciprofloxacin drops: 1–2 drops every 4 hours",
                         "precautions": "Avoid touching/rubbing eyes, wash hands frequently, no sharing towels", "duration": "5–7 days"},
    "Kidney Stone":     {"medications": ["Tamsulosin 0.4mg", "Ketorolac 30mg (pain relief)", "Potassium Citrate 10mEq", "Increase fluid intake"],
                         "dosage": "Tamsulosin 0.4mg once daily to help pass stone",
                         "precautions": "Drink 2–3L water daily, low-oxalate diet, reduce salt intake", "duration": "Varies; surgery if stone >6mm"},
    "Appendicitis":     {"medications": ["Cefuroxime IV (antibiotic)", "Metronidazole IV", "Morphine (pain management)", "IV Fluids"],
                         "dosage": "Administered under hospital/surgical supervision",
                         "precautions": "Requires urgent surgical intervention (appendectomy); do not delay", "duration": "Surgical — hospitalization 2–5 days"},
    "Thyroid Disorder": {"medications": ["Levothyroxine 50mcg (hypothyroid)", "Methimazole 10mg (hyperthyroid)", "Selenium 200mcg supplement", "Calcium/Vitamin D"],
                         "dosage": "Levothyroxine 50mcg once daily on empty stomach",
                         "precautions": "Regular TSH tests, avoid calcium/iron near dose time", "duration": "Lifelong management"},
}


# ─────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────
def _build_features(X_sym, age, gender, blood_group, extra_col=None):
    """Stack symptom binarizer output with demographic features."""
    age_arr    = np.array([[age]])
    gender_map = {"Male": [1, 0, 0], "Female": [0, 1, 0], "Other": [0, 0, 1]}
    g_arr      = np.array([gender_map.get(gender, [0, 0, 1])])
    bg_opts    = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"]
    bg_arr     = np.array([[1 if b == blood_group else 0 for b in bg_opts]])
    parts      = [X_sym, age_arr, g_arr, bg_arr]
    if extra_col is not None:
        parts.append(extra_col)
    return np.hstack(parts)


def _df_to_features(df, mlb, extra_disease_col=False, disease_le=None):
    """Convert full dataframe rows to feature matrix."""
    X_sym      = mlb.transform(df["Symptoms_List"])
    age        = df["Age"].values.reshape(-1, 1)
    gender_enc = pd.get_dummies(df["Gender"], prefix="Gender")
    # Ensure consistent column order
    for col in ["Gender_Female", "Gender_Male", "Gender_Other"]:
        if col not in gender_enc.columns:
            gender_enc[col] = 0
    gender_enc = gender_enc[["Gender_Female", "Gender_Male", "Gender_Other"]].values
    bg_enc     = pd.get_dummies(df["Blood_Group"], prefix="BG")
    for col in ["BG_A+", "BG_A-", "BG_AB+", "BG_AB-", "BG_B+", "BG_B-", "BG_O+", "BG_O-"]:
        if col not in bg_enc.columns:
            bg_enc[col] = 0
    bg_enc = bg_enc[["BG_A+", "BG_A-", "BG_AB+", "BG_AB-", "BG_B+", "BG_B-", "BG_O+", "BG_O-"]].values
    parts  = [X_sym, age, gender_enc, bg_enc]
    if extra_disease_col and disease_le is not None:
        dis = disease_le.transform(df["Predicted_Disease"]).reshape(-1, 1)
        parts.append(dis)
    return np.hstack(parts)


# ─────────────────────────────────────────────────────────────
#  LOAD DATA
# ─────────────────────────────────────────────────────────────
def load_data(path):
    print(f"\n{'='*60}")
    print("  STEP 1 — LOADING DATA")
    print(f"{'='*60}")
    df = pd.read_csv(path)
    print(f"  ✔ Records loaded   : {len(df)}")
    print(f"  ✔ Columns          : {df.shape[1]}")
    df["Symptoms_List"] = df["Symptoms"].apply(
        lambda x: [s.strip() for s in str(x).split(",")]
    )
    print(f"  ✔ Diseases found   : {df['Predicted_Disease'].nunique()}")
    print(f"  ✔ Specialists found: {df['Recommended_Specialist'].nunique()}")
    return df


# ─────────────────────────────────────────────────────────────
#  TRAIN DISEASE PREDICTOR
# ─────────────────────────────────────────────────────────────
def train_disease_predictor(df):
    print(f"\n{'='*60}")
    print("  STEP 2 — TRAINING DISEASE PREDICTOR")
    print(f"{'='*60}")

    mlb = MultiLabelBinarizer()
    mlb.fit(df["Symptoms_List"])
    print(f"  ✔ Unique symptoms  : {len(mlb.classes_)}")

    le = LabelEncoder()
    le.fit(df["Predicted_Disease"])
    print(f"  ✔ Unique diseases  : {len(le.classes_)}")

    X = _df_to_features(df, mlb)
    y = le.transform(df["Predicted_Disease"])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"  ✔ Train / Test     : {len(X_train)} / {len(X_test)}")

    print("\n  🔧 GridSearchCV (5-fold) ...")
    param_grid = {
        "n_estimators": [100, 200],
        "max_depth":    [20, 30, None],
        "min_samples_split": [2, 5],
        "class_weight": ["balanced"],
    }
    gs = GridSearchCV(
        RandomForestClassifier(random_state=RANDOM_STATE),
        param_grid, cv=5, scoring="f1_weighted", n_jobs=-1, verbose=0
    )
    gs.fit(X_train, y_train)
    model = gs.best_estimator_
    print(f"  ✔ Best params      : {gs.best_params_}")
    print(f"  ✔ Best CV F1       : {gs.best_score_:.4f}")

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred, average="weighted")
    print(f"\n  📊 Test Accuracy   : {acc*100:.2f}%")
    print(f"  📊 Test F1 (W)     : {f1:.4f}")
    print("\n" + classification_report(y_test, y_pred, target_names=le.classes_))

    joblib.dump(model, ARTIFACTS["disease_model"])
    joblib.dump(le,    ARTIFACTS["disease_le"])
    joblib.dump(mlb,   ARTIFACTS["symptom_mlb"])
    print(f"  💾 Saved: {ARTIFACTS['disease_model']}")

    return model, le, mlb, {"disease_accuracy": round(acc*100, 2), "disease_f1": round(f1, 4)}


# ─────────────────────────────────────────────────────────────
#  TRAIN SPECIALIST RECOMMENDER
# ─────────────────────────────────────────────────────────────
def train_specialist_recommender(df):
    print(f"\n{'='*60}")
    print("  STEP 3 — TRAINING SPECIALIST RECOMMENDER")
    print(f"{'='*60}")

    mlb_rec = MultiLabelBinarizer()
    mlb_rec.fit(df["Symptoms_List"])

    disease_le_rec = LabelEncoder()
    disease_le_rec.fit(df["Predicted_Disease"])

    spec_le = LabelEncoder()
    spec_le.fit(df["Recommended_Specialist"])
    print(f"  ✔ Unique specialists: {len(spec_le.classes_)}")

    X = _df_to_features(df, mlb_rec, extra_disease_col=True, disease_le=disease_le_rec)
    y = spec_le.transform(df["Recommended_Specialist"])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"  ✔ Train / Test      : {len(X_train)} / {len(X_test)}")

    print("\n  🔧 Training RandomForest (200 trees, balanced) ...")
    model = RandomForestClassifier(
        n_estimators=200, max_depth=None,
        min_samples_split=2, class_weight="balanced",
        random_state=RANDOM_STATE, n_jobs=-1
    )
    model.fit(X_train, y_train)

    cv = cross_val_score(model, X_train, y_train, cv=5, scoring="f1_weighted")
    print(f"  ✔ CV F1 (mean±std) : {cv.mean():.4f} ± {cv.std():.4f}")

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred, average="weighted")
    print(f"\n  📊 Test Accuracy   : {acc*100:.2f}%")
    print(f"  📊 Test F1 (W)     : {f1:.4f}")
    print("\n" + classification_report(y_test, y_pred, target_names=spec_le.classes_))

    joblib.dump(model,         ARTIFACTS["specialist_model"])
    joblib.dump(spec_le,       ARTIFACTS["specialist_le"])
    joblib.dump(disease_le_rec,ARTIFACTS["disease_le_rec"])
    joblib.dump(mlb_rec,       ARTIFACTS["symptom_mlb_rec"])
    print(f"  💾 Saved: {ARTIFACTS['specialist_model']}")

    return model, spec_le, disease_le_rec, mlb_rec, {
        "specialist_accuracy": round(acc*100, 2),
        "specialist_f1": round(f1, 4)
    }


# ─────────────────────────────────────────────────────────────
#  BUILD DOCTOR PROFILES
# ─────────────────────────────────────────────────────────────
def build_doctor_profiles(df):
    print(f"\n{'='*60}")
    print("  STEP 4 — BUILDING DOCTOR PROFILES")
    print(f"{'='*60}")

    profiles = {}
    for _, row in df.iterrows():
        doc  = row["Assigned_Doctor"]
        spec = row["Recommended_Specialist"]
        if doc not in profiles:
            profiles[doc] = {
                "name": doc, "specialist": spec,
                "total_appointments": 0, "completed": 0,
                "ratings": [], "booking_times": [],
                "diseases_treated": set()
            }
        profiles[doc]["total_appointments"] += 1
        profiles[doc]["diseases_treated"].add(row["Predicted_Disease"])
        profiles[doc]["booking_times"].append(row["Booking_Time_Minutes"])
        if row["Appointment_Status"] == "Completed":
            profiles[doc]["completed"] += 1
            if pd.notna(row["Patient_Satisfaction_Rating"]):
                profiles[doc]["ratings"].append(row["Patient_Satisfaction_Rating"])

    for doc in profiles:
        r  = profiles[doc]["ratings"]
        bt = profiles[doc]["booking_times"]
        profiles[doc]["avg_rating"]          = round(sum(r)/len(r), 2) if r else 4.0
        profiles[doc]["avg_booking_minutes"] = round(sum(bt)/len(bt), 1) if bt else 10.0
        profiles[doc]["diseases_treated"]    = sorted(profiles[doc]["diseases_treated"])
        del profiles[doc]["ratings"]
        del profiles[doc]["booking_times"]

    joblib.dump(profiles, ARTIFACTS["doctor_profiles"])
    print(f"  ✔ Doctor profiles built : {len(profiles)}")
    print(f"  ✔ Medication DB entries : {len(MEDICATION_DB)}")
    print(f"  💾 Saved: {ARTIFACTS['doctor_profiles']}")
    return profiles


# ─────────────────────────────────────────────────────────────
#  SAVE TRAINING REPORT
# ─────────────────────────────────────────────────────────────
def save_report(metrics, dataset_path):
    report = {
        "dataset": dataset_path,
        "total_records": metrics.get("total_records"),
        "models": {
            "disease_predictor": {
                "algorithm": "RandomForestClassifier + GridSearchCV",
                "test_accuracy_%": metrics["disease_accuracy"],
                "test_f1_weighted": metrics["disease_f1"],
                "artifacts": [ARTIFACTS["disease_model"], ARTIFACTS["disease_le"], ARTIFACTS["symptom_mlb"]]
            },
            "specialist_recommender": {
                "algorithm": "RandomForestClassifier (200 trees, balanced)",
                "test_accuracy_%": metrics["specialist_accuracy"],
                "test_f1_weighted": metrics["specialist_f1"],
                "artifacts": [ARTIFACTS["specialist_model"], ARTIFACTS["specialist_le"],
                               ARTIFACTS["disease_le_rec"], ARTIFACTS["symptom_mlb_rec"]]
            }
        },
        "doctor_profiles": ARTIFACTS["doctor_profiles"],
        "medication_db_diseases": list(MEDICATION_DB.keys())
    }
    with open(ARTIFACTS["training_report"], "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n  💾 Training report → {ARTIFACTS['training_report']}")


# ─────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Train Disease Predictor & Specialist Recommender")
    parser.add_argument("--data", default="medical_patient_dataset.csv",
                        help="Path to training CSV dataset")
    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(f"❌ Dataset not found: {args.data}")
        print("   Make sure 'medical_patient_dataset.csv' is in the same folder.")
        return

    print("\n" + "█"*60)
    print("  DOCTOR APPOINTMENT APP — TRAINING PIPELINE")
    print("█"*60)

    df = load_data(args.data)

    _, _, _, disease_metrics = train_disease_predictor(df)
    _, _, _, _, spec_metrics = train_specialist_recommender(df)
    build_doctor_profiles(df)

    metrics = {**disease_metrics, **spec_metrics, "total_records": len(df)}
    save_report(metrics, args.data)

    print(f"\n{'█'*60}")
    print("  ✅ ALL TRAINING COMPLETE")
    print(f"{'█'*60}")
    print(f"  Disease Predictor Accuracy    : {metrics['disease_accuracy']}%")
    print(f"  Specialist Recommender Accuracy: {metrics['specialist_accuracy']}%")
    print(f"\n  Run the app with:  python app.py")
    print(f"{'█'*60}\n")


if __name__ == "__main__":
    main()