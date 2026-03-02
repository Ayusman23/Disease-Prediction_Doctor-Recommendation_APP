"""
================================================================
  DOCTOR & MEDICATION RECOMMENDER - ML MODEL
  Trained on: medical_patient_dataset.csv
  Models:
    - Specialist Recommender : Random Forest Classifier
    - Doctor Recommender     : Rule-based + ML ranking
    - Medication Suggester   : Disease → medication mapping
  Input: Predicted disease / symptoms
  Output: Specialist, Doctor name, Medications, Appointment slot
================================================================
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, f1_score
import warnings
warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────
DATASET_PATH            = "medical_patient_dataset.csv"
SPECIALIST_MODEL_PATH   = "specialist_recommender_model.pkl"
SPECIALIST_LE_PATH      = "specialist_label_encoder.pkl"
DISEASE_LE_PATH         = "disease_le_for_recommender.pkl"
MLB_PATH                = "symptom_mlb_recommender.pkl"
DOCTOR_PROFILES_PATH    = "doctor_profiles.pkl"
RANDOM_STATE            = 42
TEST_SIZE               = 0.2

# ─────────────────────────────────────────────
#  MEDICATION DATABASE  (disease → medications)
# ─────────────────────────────────────────────
MEDICATION_DB = {
    "Flu": {
        "medications": ["Paracetamol 500mg", "Oseltamivir (Tamiflu)", "Cetirizine 10mg", "Ibuprofen 400mg"],
        "dosage": "Paracetamol: 1 tablet every 6 hours | Tamiflu: 75mg twice daily for 5 days",
        "precautions": "Rest, stay hydrated, avoid cold exposure",
        "duration": "5–7 days"
    },
    "Diabetes": {
        "medications": ["Metformin 500mg", "Glipizide 5mg", "Insulin (if required)", "Vitamin B12"],
        "dosage": "Metformin: 500mg twice daily with meals",
        "precautions": "Monitor blood sugar daily, low-sugar diet, regular exercise",
        "duration": "Lifelong management"
    },
    "Hypertension": {
        "medications": ["Amlodipine 5mg", "Losartan 50mg", "Hydrochlorothiazide 25mg", "Atenolol 50mg"],
        "dosage": "Amlodipine: 5mg once daily | Losartan: 50mg once daily",
        "precautions": "Low-sodium diet, no smoking, reduce stress, monitor BP regularly",
        "duration": "Lifelong management"
    },
    "Asthma": {
        "medications": ["Salbutamol Inhaler", "Budesonide Inhaler", "Montelukast 10mg", "Prednisolone (acute)"],
        "dosage": "Salbutamol: 2 puffs as needed | Budesonide: 1 puff twice daily",
        "precautions": "Avoid triggers (dust, smoke), carry inhaler always",
        "duration": "Ongoing management"
    },
    "Malaria": {
        "medications": ["Artemether-Lumefantrine", "Chloroquine 250mg", "Primaquine 15mg", "Paracetamol 500mg"],
        "dosage": "Artemether-Lumefantrine: 4 tablets twice daily for 3 days",
        "precautions": "Complete full course, use mosquito nets, stay hydrated",
        "duration": "3–7 days"
    },
    "Dengue": {
        "medications": ["Paracetamol 500mg", "Oral Rehydration Salts (ORS)", "Vitamin C supplements"],
        "dosage": "Paracetamol: 500mg every 6 hours (avoid NSAIDs/Aspirin)",
        "precautions": "Avoid Ibuprofen/Aspirin, rest, monitor platelet count",
        "duration": "7–10 days"
    },
    "Typhoid": {
        "medications": ["Azithromycin 500mg", "Ciprofloxacin 500mg", "Cefixime 200mg", "ORS"],
        "dosage": "Azithromycin: 500mg once daily for 7 days",
        "precautions": "Consume only boiled/safe water, avoid outside food",
        "duration": "7–14 days"
    },
    "Pneumonia": {
        "medications": ["Amoxicillin 500mg", "Azithromycin 500mg", "Cough syrup (Dextromethorphan)", "Paracetamol"],
        "dosage": "Amoxicillin: 500mg three times daily for 7 days",
        "precautions": "Rest, deep breathing exercises, stay warm",
        "duration": "7–14 days"
    },
    "Migraine": {
        "medications": ["Sumatriptan 50mg", "Ibuprofen 400mg", "Topiramate (preventive)", "Amitriptyline"],
        "dosage": "Sumatriptan: 50mg at onset of migraine, may repeat after 2 hours",
        "precautions": "Avoid triggers (light, stress), rest in dark room",
        "duration": "Per episode; preventive therapy ongoing"
    },
    "Arthritis": {
        "medications": ["Ibuprofen 400mg", "Methotrexate 7.5mg", "Hydroxychloroquine 200mg", "Diclofenac gel"],
        "dosage": "Ibuprofen: 400mg three times daily with food",
        "precautions": "Physiotherapy, gentle exercise, avoid joint strain",
        "duration": "Lifelong management"
    },
    "Gastritis": {
        "medications": ["Omeprazole 20mg", "Pantoprazole 40mg", "Antacid (Gelusil/Digene)", "Domperidone 10mg"],
        "dosage": "Omeprazole: 20mg once daily before breakfast",
        "precautions": "Avoid spicy/oily food, alcohol, coffee; eat small meals",
        "duration": "2–4 weeks"
    },
    "Anemia": {
        "medications": ["Ferrous Sulfate 200mg", "Folic Acid 5mg", "Vitamin B12 injections", "Vitamin C 500mg"],
        "dosage": "Ferrous Sulfate: 200mg twice daily with Vitamin C",
        "precautions": "Iron-rich diet (spinach, lentils, red meat), avoid tea/coffee with meals",
        "duration": "3–6 months"
    },
    "UTI": {
        "medications": ["Nitrofurantoin 100mg", "Trimethoprim 200mg", "Ciprofloxacin 250mg", "Cranberry supplements"],
        "dosage": "Nitrofurantoin: 100mg twice daily for 5 days",
        "precautions": "Drink plenty of water, maintain hygiene, urinate after intercourse",
        "duration": "5–7 days"
    },
    "Depression": {
        "medications": ["Sertraline 50mg", "Fluoxetine 20mg", "Escitalopram 10mg", "Clonazepam 0.5mg (if needed)"],
        "dosage": "Sertraline: 50mg once daily (morning)",
        "precautions": "Do not stop suddenly, therapy recommended alongside medication",
        "duration": "6–12 months or as advised"
    },
    "Anxiety Disorder": {
        "medications": ["Alprazolam 0.25mg", "Buspirone 10mg", "Sertraline 50mg", "Propranolol 10mg (for physical symptoms)"],
        "dosage": "Buspirone: 10mg twice daily | Alprazolam: only as needed (short-term)",
        "precautions": "Cognitive behavioral therapy (CBT) strongly recommended",
        "duration": "6–12 months"
    },
    "Skin Allergy": {
        "medications": ["Cetirizine 10mg", "Loratadine 10mg", "Hydrocortisone cream 1%", "Calamine lotion"],
        "dosage": "Cetirizine: 10mg once daily at night",
        "precautions": "Identify and avoid allergens, use hypoallergenic products",
        "duration": "Until symptoms resolve (1–2 weeks)"
    },
    "Conjunctivitis": {
        "medications": ["Ciprofloxacin eye drops", "Olopatadine eye drops", "Artificial tears", "Tobramycin ointment"],
        "dosage": "Ciprofloxacin drops: 1–2 drops every 4 hours",
        "precautions": "Avoid touching/rubbing eyes, wash hands frequently, no sharing towels",
        "duration": "5–7 days"
    },
    "Kidney Stone": {
        "medications": ["Tamsulosin 0.4mg", "Ketorolac 30mg (pain)", "Potassium Citrate", "Plenty of fluids"],
        "dosage": "Tamsulosin: 0.4mg once daily to help pass stone",
        "precautions": "Drink 2–3 litres of water daily, low-oxalate diet, reduce salt",
        "duration": "Varies; surgery if stone >6mm"
    },
    "Appendicitis": {
        "medications": ["Cefuroxime (IV antibiotic)", "Metronidazole (IV)", "Morphine (pain management)"],
        "dosage": "Administered under hospital supervision",
        "precautions": "Usually requires surgery (appendectomy); do not delay treatment",
        "duration": "Surgical intervention required"
    },
    "Thyroid Disorder": {
        "medications": ["Levothyroxine 50mcg (hypothyroid)", "Methimazole 10mg (hyperthyroid)", "Selenium supplements"],
        "dosage": "Levothyroxine: 50mcg once daily on empty stomach",
        "precautions": "Regular thyroid function tests (TSH), avoid calcium/iron near dose time",
        "duration": "Lifelong management"
    }
}


# ─────────────────────────────────────────────
#  1. LOAD & PREPROCESS DATA
# ─────────────────────────────────────────────
def load_and_preprocess(path):
    print("\n📂 Loading dataset...")
    df = pd.read_csv(path)
    print(f"   ✔ Loaded {len(df)} records")

    df["Symptoms_List"] = df["Symptoms"].apply(
        lambda x: [s.strip() for s in x.split(",")]
    )

    # Encode disease (input feature)
    disease_le = LabelEncoder()
    df["Disease_Encoded"] = disease_le.fit_transform(df["Predicted_Disease"])

    # Encode specialist (target)
    spec_le = LabelEncoder()
    df["Specialist_Encoded"] = spec_le.fit_transform(df["Recommended_Specialist"])

    # Symptom binarizer
    mlb = MultiLabelBinarizer()
    X_sym = mlb.fit_transform(df["Symptoms_List"])

    # Features: symptoms + age + gender + blood group + disease
    age        = df["Age"].values.reshape(-1, 1)
    disease_f  = df["Disease_Encoded"].values.reshape(-1, 1)
    gender_enc = pd.get_dummies(df["Gender"], prefix="Gender").values
    blood_enc  = pd.get_dummies(df["Blood_Group"], prefix="BG").values

    X = np.hstack([X_sym, age, gender_enc, blood_enc, disease_f])
    y = df["Specialist_Encoded"].values

    print(f"   ✔ Unique specialists : {len(spec_le.classes_)}")
    print(f"   ✔ Unique diseases    : {len(disease_le.classes_)}")

    return X, y, spec_le, disease_le, mlb, df


# ─────────────────────────────────────────────
#  2. BUILD DOCTOR PROFILES from dataset
# ─────────────────────────────────────────────
def build_doctor_profiles(df):
    print("\n👨‍⚕️ Building doctor profiles from dataset...")
    profiles = {}
    completed = df[df["Appointment_Status"] == "Completed"]

    for _, row in df.iterrows():
        doc = row["Assigned_Doctor"]
        spec = row["Recommended_Specialist"]
        if doc not in profiles:
            profiles[doc] = {
                "name": doc,
                "specialist": spec,
                "total_appointments": 0,
                "completed_appointments": 0,
                "total_rating": 0,
                "rating_count": 0,
                "diseases_treated": set(),
                "avg_booking_time": []
            }
        profiles[doc]["total_appointments"] += 1
        profiles[doc]["diseases_treated"].add(row["Predicted_Disease"])
        profiles[doc]["avg_booking_time"].append(row["Booking_Time_Minutes"])
        if row["Appointment_Status"] == "Completed":
            profiles[doc]["completed_appointments"] += 1
            if pd.notna(row["Patient_Satisfaction_Rating"]):
                profiles[doc]["total_rating"] += row["Patient_Satisfaction_Rating"]
                profiles[doc]["rating_count"] += 1

    # Compute averages
    for doc in profiles:
        rc = profiles[doc]["rating_count"]
        profiles[doc]["avg_rating"] = (
            round(profiles[doc]["total_rating"] / rc, 2) if rc > 0 else 4.0
        )
        bt = profiles[doc]["avg_booking_time"]
        profiles[doc]["avg_booking_minutes"] = round(sum(bt) / len(bt), 1) if bt else 10
        profiles[doc]["diseases_treated"] = list(profiles[doc]["diseases_treated"])

    print(f"   ✔ Built profiles for {len(profiles)} doctors")
    return profiles


# ─────────────────────────────────────────────
#  3. TRAIN SPECIALIST RECOMMENDER
# ─────────────────────────────────────────────
def train_specialist_model(X_train, y_train):
    print("\n🔧 Training Specialist Recommender (Random Forest)...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring="f1_weighted")
    print(f"   ✔ CV F1 Score (mean): {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    return model


# ─────────────────────────────────────────────
#  4. EVALUATE MODEL
# ─────────────────────────────────────────────
def evaluate_model(model, X_test, y_test, spec_le):
    print("\n📊 Evaluating Specialist Recommender...")
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred, average="weighted")
    print(f"   ✔ Accuracy : {acc * 100:.2f}%")
    print(f"   ✔ F1 Score : {f1:.4f}")
    print("\n📋 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=spec_le.classes_))


# ─────────────────────────────────────────────
#  5. SAVE ARTIFACTS
# ─────────────────────────────────────────────
def save_artifacts(model, spec_le, disease_le, mlb, doctor_profiles):
    joblib.dump(model, SPECIALIST_MODEL_PATH)
    joblib.dump(spec_le, SPECIALIST_LE_PATH)
    joblib.dump(disease_le, DISEASE_LE_PATH)
    joblib.dump(mlb, MLB_PATH)
    joblib.dump(doctor_profiles, DOCTOR_PROFILES_PATH)
    print(f"\n💾 Specialist model saved  → {SPECIALIST_MODEL_PATH}")
    print(f"💾 Doctor profiles saved   → {DOCTOR_PROFILES_PATH}")


# ─────────────────────────────────────────────
#  6. RECOMMEND FUNCTION (for app integration)
# ─────────────────────────────────────────────
def recommend(
    predicted_disease: str,
    symptoms: list,
    age: int = 30,
    gender: str = "Male",
    blood_group: str = "O+"
):
    """
    Full recommendation: Specialist + Best Doctor + Medications.

    Parameters:
        predicted_disease (str) : e.g. "Diabetes"
        symptoms          (list): e.g. ["Fatigue", "Blurred Vision"]
        age               (int) : Patient age
        gender            (str) : 'Male', 'Female', or 'Other'
        blood_group       (str) : e.g. 'O+', 'A-'

    Returns:
        dict with specialist, top doctors, medications, dosage, precautions
    """
    model     = joblib.load(SPECIALIST_MODEL_PATH)
    spec_le   = joblib.load(SPECIALIST_LE_PATH)
    disease_le= joblib.load(DISEASE_LE_PATH)
    mlb       = joblib.load(MLB_PATH)
    profiles  = joblib.load(DOCTOR_PROFILES_PATH)

    # Build feature vector
    symptoms_clean = [s.strip() for s in symptoms]
    X_sym    = mlb.transform([symptoms_clean])
    age_arr  = np.array([[age]])

    gender_map = {"Male": [1, 0, 0], "Female": [0, 1, 0], "Other": [0, 0, 1]}
    gender_arr = np.array([gender_map.get(gender, [0, 0, 1])])
    bg_options = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"]
    bg_arr     = np.array([[1 if b == blood_group else 0 for b in bg_options]])

    try:
        dis_enc = disease_le.transform([predicted_disease]).reshape(-1, 1)
    except Exception:
        dis_enc = np.array([[0]])

    X = np.hstack([X_sym, age_arr, gender_arr, bg_arr, dis_enc])

    # Predict specialist
    proba    = model.predict_proba(X)[0]
    top_idx  = np.argsort(proba)[::-1][:3]
    specialist = spec_le.inverse_transform([top_idx[0]])[0]
    spec_confidence = round(proba[top_idx[0]] * 100, 2)

    # Find best doctors for this specialist
    matching_doctors = [
        (doc, info) for doc, info in profiles.items()
        if info["specialist"] == specialist
    ]
    # Sort by avg_rating descending, then fewest avg_booking_time
    matching_doctors.sort(
        key=lambda x: (-x[1]["avg_rating"], x[1]["avg_booking_minutes"])
    )

    top_doctors = []
    for doc_name, info in matching_doctors[:3]:
        top_doctors.append({
            "name": info["name"],
            "specialist": info["specialist"],
            "avg_rating": info["avg_rating"],
            "total_patients": info["total_appointments"],
            "avg_booking_time_min": info["avg_booking_minutes"],
            "diseases_treated": info["diseases_treated"][:5]
        })

    # Get medications
    med_info = MEDICATION_DB.get(predicted_disease, {
        "medications": ["Please consult the recommended specialist"],
        "dosage": "As prescribed by doctor",
        "precautions": "Follow doctor's advice",
        "duration": "As advised"
    })

    return {
        "predicted_disease": predicted_disease,
        "recommended_specialist": specialist,
        "specialist_confidence": spec_confidence,
        "top_doctors": top_doctors,
        "medications": med_info["medications"],
        "dosage_instructions": med_info["dosage"],
        "precautions": med_info["precautions"],
        "treatment_duration": med_info["duration"]
    }


# ─────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 65)
    print("  DOCTOR & MEDICATION RECOMMENDER - TRAINING PIPELINE")
    print("=" * 65)

    # Step 1: Load
    X, y, spec_le, disease_le, mlb, df = load_and_preprocess(DATASET_PATH)

    # Step 2: Build doctor profiles
    doctor_profiles = build_doctor_profiles(df)

    # Step 3: Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"\n🔀 Train: {len(X_train)} | Test: {len(X_test)}")

    # Step 4: Train specialist model
    model = train_specialist_model(X_train, y_train)

    # Step 5: Evaluate
    evaluate_model(model, X_test, y_test, spec_le)

    # Step 6: Save
    save_artifacts(model, spec_le, disease_le, mlb, doctor_profiles)

    # Step 7: Demo
    print("\n" + "=" * 65)
    print("  DEMO RECOMMENDATION")
    print("=" * 65)
    result = recommend(
        predicted_disease="Diabetes",
        symptoms=["Frequent Urination", "Fatigue", "Blurred Vision"],
        age=45,
        gender="Female",
        blood_group="A+"
    )

    print(f"\n  Disease           : {result['predicted_disease']}")
    print(f"  Specialist        : {result['recommended_specialist']} ({result['specialist_confidence']}% confidence)")
    print(f"\n  🏥 Top Doctors    :")
    for d in result["top_doctors"]:
        print(f"    → {d['name']} | ⭐ {d['avg_rating']} | {d['total_patients']} patients | Booking: ~{d['avg_booking_time_min']} min")
    print(f"\n  💊 Medications    : {', '.join(result['medications'])}")
    print(f"  📋 Dosage         : {result['dosage_instructions']}")
    print(f"  ⚠️  Precautions    : {result['precautions']}")
    print(f"  ⏱  Duration       : {result['treatment_duration']}")

    print("\n✅ Doctor & Medication Recommender training complete!")