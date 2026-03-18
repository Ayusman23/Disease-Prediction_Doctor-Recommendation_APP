"""
╔══════════════════════════════════════════════════════════════════╗
║      MEDIPREDICT — DOCTOR & MEDICATION RECOMMENDER v2.0         ║
║──────────────────────────────────────────────────────────────────║
║  Models:                                                        ║
║    • Specialist Recommender — Random Forest Classifier          ║
║    • Doctor Ranking         — Multi-factor scoring algorithm    ║
║    • Medication Suggester   — Curated disease→medication DB     ║
║  Input  : Predicted disease / symptoms / patient profile        ║
║  Output : Specialist · Doctors · Medications · Slots · Risk     ║
╚══════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import time
import logging
import warnings
import hashlib
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import classification_report, accuracy_score, f1_score

warnings.filterwarnings("ignore")

# ══════════════════════════════════════════════════════════════════
#  LOGGING
# ══════════════════════════════════════════════════════════════════
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_DIR / "doctor_recommender.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("DoctorRecommender")

# ══════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ══════════════════════════════════════════════════════════════════
BASE_DIR               = Path(__file__).parent
DATASET_PATH           = BASE_DIR / "medical_patient_dataset.csv"
ARTIFACT_DIR           = BASE_DIR / "artifacts"
ARTIFACT_DIR.mkdir(exist_ok=True)

SPECIALIST_MODEL_PATH  = ARTIFACT_DIR / "specialist_recommender_model.pkl"
SPECIALIST_LE_PATH     = ARTIFACT_DIR / "specialist_label_encoder.pkl"
DISEASE_LE_PATH        = ARTIFACT_DIR / "disease_le_for_recommender.pkl"
MLB_PATH               = ARTIFACT_DIR / "symptom_mlb_recommender.pkl"
DOCTOR_PROFILES_PATH   = ARTIFACT_DIR / "doctor_profiles.pkl"
DOCTOR_META_PATH       = ARTIFACT_DIR / "doctor_recommender_metadata.json"

RANDOM_STATE           = 42
TEST_SIZE              = 0.20
CV_FOLDS               = 5
SLOTS_PER_DOCTOR       = 6

# ══════════════════════════════════════════════════════════════════
#  COMPREHENSIVE MEDICATION DATABASE
# ══════════════════════════════════════════════════════════════════
MEDICATION_DB = {
    "Flu": {
        "medications":        ["Paracetamol 500mg", "Oseltamivir (Tamiflu) 75mg",
                               "Cetirizine 10mg", "Ibuprofen 400mg"],
        "dosage":             "Paracetamol: 1 tab every 6 hrs | Tamiflu 75mg twice daily × 5 days",
        "precautions":        "Rest, stay hydrated, avoid cold exposure, isolate if contagious",
        "duration":           "5–7 days",
        "follow_up":          "If fever persists > 3 days or breathing difficulty — seek emergency care",
        "lifestyle_tips":     ["Drink 8+ glasses of water/day", "Vitamin C supplements",
                               "Steam inhalation 2–3× daily"],
        "avoid":              ["Aspirin (children)", "Alcohol", "Strenuous exercise"],
        "emergency_signs":    ["High fever > 39.5°C", "Chest pain", "Difficulty breathing"]
    },
    "Diabetes": {
        "medications":        ["Metformin 500mg", "Glipizide 5mg",
                               "Insulin (if required)", "Vitamin B12 500mcg"],
        "dosage":             "Metformin: 500mg twice daily with meals | Monitor sugar 2× daily",
        "precautions":        "Monitor blood glucose, low-GI diet, regular moderate exercise",
        "duration":           "Lifelong management",
        "follow_up":          "HbA1c test every 3 months, annual eye & kidney screenings",
        "lifestyle_tips":     ["Carb-controlled diet", "30 min exercise 5×/week",
                               "Monitor feet daily", "Quit smoking"],
        "avoid":              ["Refined sugar", "White rice/bread", "Alcohol", "Skipping meals"],
        "emergency_signs":    ["Blood sugar < 70 mg/dL (hypoglycemia)",
                               "Extreme thirst + frequent urination", "Blurred vision"]
    },
    "Hypertension": {
        "medications":        ["Amlodipine 5mg", "Losartan 50mg",
                               "Hydrochlorothiazide 25mg", "Atenolol 50mg"],
        "dosage":             "Amlodipine: 5mg once daily (morning) | Losartan: 50mg once daily",
        "precautions":        "DASH diet, low sodium (< 2g/day), monitor BP daily, no smoking",
        "duration":           "Lifelong management",
        "follow_up":          "Monthly BP check first 3 months, then quarterly",
        "lifestyle_tips":     ["DASH diet (fruits, veges, low-fat dairy)",
                               "Limit alcohol (< 1 drink/day)", "Manage stress (meditation/yoga)",
                               "Lose excess weight"],
        "avoid":              ["High salt foods", "Caffeine excess", "NSAIDs (may raise BP)"],
        "emergency_signs":    ["BP > 180/120 mmHg (hypertensive crisis)",
                               "Severe headache + chest pain", "Vision changes"]
    },
    "Asthma": {
        "medications":        ["Salbutamol Inhaler 100mcg (reliever)",
                               "Budesonide Inhaler 200mcg (preventer)",
                               "Montelukast 10mg", "Prednisolone 5mg (acute)"],
        "dosage":             "Salbutamol: 2 puffs as needed | Budesonide: 1 puff twice daily",
        "precautions":        "Identify & avoid triggers (dust, pet dander, smoke, cold air)",
        "duration":           "Ongoing management — preventer taken daily",
        "follow_up":          "Peak flow monitoring; spirometry every 12 months",
        "lifestyle_tips":     ["HEPA air purifier at home", "Keep windows closed in pollen season",
                               "Breathing exercises (Buteyko)", "Influenza vaccination annually"],
        "avoid":              ["Cigarette smoke", "Aspirin/NSAIDs", "Mould exposure"],
        "emergency_signs":    ["Lips/fingertips turning blue", "Rescue inhaler not helping",
                               "Difficulty speaking due to breathlessness"]
    },
    "Malaria": {
        "medications":        ["Artemether-Lumefantrine 80/480mg", "Chloroquine 250mg",
                               "Primaquine 15mg", "Paracetamol 500mg"],
        "dosage":             "Artemether-Lumefantrine: 4 tablets twice daily × 3 days",
        "precautions":        "Complete full course, mosquito net, repellents, drain stagnant water",
        "duration":           "3–7 days (depending on strain)",
        "follow_up":          "Blood smear test after treatment to confirm clearance",
        "lifestyle_tips":     ["Sleep under insecticide-treated net", "Wear long sleeves at dusk",
                               "Use DEET based repellent", "Antimalarial prophylaxis if travelling"],
        "avoid":              ["Alcohol during treatment"],
        "emergency_signs":    ["Seizures", "Confusion/altered consciousness",
                               "Severe anaemia", "Spontaneous bleeding"]
    },
    "Dengue": {
        "medications":        ["Paracetamol 500mg", "Oral Rehydration Salts (ORS)",
                               "Vitamin C 500mg", "Papaya leaf extract (supplement)"],
        "dosage":             "Paracetamol: 500mg every 6 hrs (strictly avoid NSAIDs/Aspirin)",
        "precautions":        "Monitor platelet count daily, IV fluids if needed, bed rest",
        "duration":           "7–10 days; severe cases require hospitalisation",
        "follow_up":          "Daily CBC (platelet count monitoring) until stable",
        "lifestyle_tips":     ["Avoid stagnant water around home", "Use mosquito repellent",
                               "Wear full-sleeve clothing"],
        "avoid":              ["Ibuprofen", "Aspirin", "Diclofenac (increases bleeding risk)"],
        "emergency_signs":    ["Platelet < 20,000", "Bleeding from gums/nose",
                               "Severe abdominal pain", "Persistent vomiting"]
    },
    "Typhoid": {
        "medications":        ["Azithromycin 500mg", "Ciprofloxacin 500mg",
                               "Cefixime 200mg", "ORS"],
        "dosage":             "Azithromycin: 500mg once daily × 7 days (1st line)",
        "precautions":        "Safe drinking water only, handwashing, typhoid vaccine",
        "duration":           "7–14 days antibiotic course",
        "follow_up":          "Stool culture after treatment; carrier screening",
        "lifestyle_tips":     ["Boil water before drinking", "Eat home-cooked food",
                               "Wash hands frequently with soap"],
        "avoid":              ["Dairy products if lactose intolerant", "Street food",
                               "Unboiled water"],
        "emergency_signs":    ["Intestinal perforation (severe abdominal pain)",
                               "High persistent fever > 7 days", "Confusion"]
    },
    "Pneumonia": {
        "medications":        ["Amoxicillin 500mg", "Azithromycin 500mg",
                               "Dextromethorphan (cough syrup)", "Paracetamol 500mg"],
        "dosage":             "Amoxicillin: 500mg three times daily × 7 days",
        "precautions":        "Rest, deep breathing exercises, stay warm & hydrated",
        "duration":           "7–14 days; severe cases require IV antibiotics",
        "follow_up":          "Chest X-ray after 4–6 weeks to confirm resolution",
        "lifestyle_tips":     ["Annual pneumococcal vaccine for 65+", "Quit smoking",
                               "Humidifier in bedroom"],
        "avoid":              ["Cold air exposure", "Alcohol", "Suppressing cough reflex"],
        "emergency_signs":    ["SpO2 < 92%", "Cyanosis", "Rapid breathing > 30 breaths/min",
                               "Confusion in elderly"]
    },
    "Migraine": {
        "medications":        ["Sumatriptan 50mg (acute)", "Ibuprofen 400mg",
                               "Topiramate 25mg (preventive)", "Amitriptyline 10mg (preventive)"],
        "dosage":             "Sumatriptan: 50mg at onset; may repeat after 2 hours (max 2/day)",
        "precautions":        "Identify triggers; maintain sleep schedule; stay hydrated",
        "duration":           "Per episode; preventive therapy 3–6 months",
        "follow_up":          "Headache diary; neurologist if > 4 episodes/month",
        "lifestyle_tips":     ["Consistent meal times", "Blue-light filter on screens",
                               "Magnesium 400mg supplement", "Regular aerobic exercise"],
        "avoid":              ["Aged cheese", "Red wine", "MSG", "Skipping meals", "Stress"],
        "emergency_signs":    ["Thunderclap headache (worst of your life)", "Headache + fever + stiff neck",
                               "Headache + neurological symptoms (weakness, vision loss)"]
    },
    "Arthritis": {
        "medications":        ["Ibuprofen 400mg", "Methotrexate 7.5mg (RA)",
                               "Hydroxychloroquine 200mg", "Diclofenac gel 1%"],
        "dosage":             "Ibuprofen: 400mg three times daily with food; MTX weekly",
        "precautions":        "Physiotherapy, joint protection, avoid overloading joints",
        "duration":           "Lifelong — focus on disease modification and pain management",
        "follow_up":          "Rheumatologist review every 3 months; liver function tests on MTX",
        "lifestyle_tips":     ["Swimming or cycling (low-impact)", "Weight management",
                               "Hot/cold therapy for joints", "Omega-3 fatty acids"],
        "avoid":              ["High-impact activities", "Prolonged joint immobility",
                               "NSAIDs on empty stomach"],
        "emergency_signs":    ["Sudden severe joint pain + swelling + fever (septic arthritis)",
                               "Unable to bear weight on joint"]
    },
    "Gastritis": {
        "medications":        ["Omeprazole 20mg", "Pantoprazole 40mg",
                               "Antacid (Gelusil/Digene)", "Domperidone 10mg"],
        "dosage":             "Omeprazole: 20mg once daily before breakfast × 4 weeks",
        "precautions":        "Small frequent meals, avoid spicy/oily food, don't lie down after eating",
        "duration":           "2–4 weeks; H. pylori eradication if detected",
        "follow_up":          "H. pylori breath test; endoscopy if symptoms persist > 6 weeks",
        "lifestyle_tips":     ["Elevate bed head by 6 inches", "De-stress (anxiety worsens GERD)",
                               "Probiotic supplement"],
        "avoid":              ["Alcohol", "Coffee & caffeine", "NSAIDs/Aspirin",
                               "Spicy food", "Late-night eating"],
        "emergency_signs":    ["Vomiting blood (haematemesis)", "Black tarry stools (melena)",
                               "Severe stomach pain radiating to back"]
    },
    "Anemia": {
        "medications":        ["Ferrous Sulfate 200mg", "Folic Acid 5mg",
                               "Vitamin B12 1000mcg (injection)", "Vitamin C 500mg"],
        "dosage":             "Ferrous Sulfate: 200mg twice daily 30 min before meals with Vit C",
        "precautions":        "Iron-rich diet, avoid consuming tea/coffee within 1h of iron tablets",
        "duration":           "3–6 months; check Hb monthly",
        "follow_up":          "CBC every 4–6 weeks; bone marrow biopsy if unexplained anaemia",
        "lifestyle_tips":     ["Eat spinach, lentils, red meat, fortified cereals",
                               "Cook in cast-iron cookware", "Vitamin C at every iron-rich meal"],
        "avoid":              ["Tea/coffee/milk with iron tablets", "Calcium supplements near iron dose"],
        "emergency_signs":    ["Hb < 7 g/dL (severe)", "Fainting", "Chest pain",
                               "Very rapid heartbeat"]
    },
    "UTI": {
        "medications":        ["Nitrofurantoin 100mg", "Trimethoprim 200mg",
                               "Ciprofloxacin 250mg", "D-Mannose supplement"],
        "dosage":             "Nitrofurantoin: 100mg twice daily × 5 days (women) / 7 days (men)",
        "precautions":        "Drink 2–3L water daily, urinate after intercourse, front-to-back wiping",
        "duration":           "5–7 days for uncomplicated UTI",
        "follow_up":          "Urine culture after treatment; investigate if recurrent (> 2/year)",
        "lifestyle_tips":     ["Cranberry juice/supplements", "Cotton underwear",
                               "Don't hold urine", "Probiotics (Lactobacillus)"],
        "avoid":              ["Spermicides", "Bubble baths", "Tight synthetic underwear"],
        "emergency_signs":    ["Fever > 38.5°C + flank pain (pyelonephritis)",
                               "Blood in urine (haematuria)", "UTI in pregnancy"]
    },
    "Depression": {
        "medications":        ["Sertraline 50mg (SSRI)", "Fluoxetine 20mg",
                               "Escitalopram 10mg", "Mirtazapine 15mg (sleep)"],
        "dosage":             "Sertraline: 50mg once daily (morning); increase to 100mg after 2 weeks if tolerated",
        "precautions":        "Do not stop abruptly; monitor for suicidal ideation in first 2 weeks",
        "duration":           "Minimum 6 months after first episode; longer for recurrent",
        "follow_up":          "Psychiatrist/psychologist review every 4–6 weeks",
        "lifestyle_tips":     ["CBT (Cognitive Behavioural Therapy)", "Daily exercise 30 min",
                               "Social connection & support network", "Sleep hygiene routine",
                               "Mindfulness meditation"],
        "avoid":              ["Alcohol & recreational drugs", "Isolation", "Skipping therapy",
                               "Abrupt discontinuation of antidepressants"],
        "emergency_signs":    ["Suicidal thoughts", "Self-harm",
                               "Psychosis (hallucinations/delusions)"]
    },
    "Anxiety Disorder": {
        "medications":        ["Buspirone 10mg", "Sertraline 50mg",
                               "Alprazolam 0.25mg (short-term only)", "Propranolol 10mg (physical Sx)"],
        "dosage":             "Buspirone: 10mg twice daily (takes 2–4 weeks to be effective)",
        "precautions":        "Benzodiazepines risk dependence — only short-term; combine with therapy",
        "duration":           "6–12 months medication; therapy ongoing",
        "follow_up":          "GAD-7 scale assessment monthly; psychiatrist review quarterly",
        "lifestyle_tips":     ["Diaphragmatic breathing (4-7-8 technique)",
                               "Limit caffeine to 1 cup/day", "Regular aerobic exercise",
                               "Progressive muscle relaxation"],
        "avoid":              ["Caffeine excess", "Alcohol (short-term relief but worsens anxiety)",
                               "Avoiding feared situations (increases anxiety long-term)"],
        "emergency_signs":    ["Panic attack with chest pain (rule out cardiac)", "Suicidal thoughts"]
    },
    "Skin Allergy": {
        "medications":        ["Cetirizine 10mg", "Loratadine 10mg",
                               "Hydrocortisone cream 1%", "Calamine lotion"],
        "dosage":             "Cetirizine: 10mg once daily at night (non-drowsy alternative: Loratadine 10mg morning)",
        "precautions":        "Identify & avoid allergens; use hypoallergenic products",
        "duration":           "Until symptoms resolve (typically 1–2 weeks)",
        "follow_up":          "Allergy patch/skin-prick testing if recurrent; dermatologist referral",
        "lifestyle_tips":     ["Fragrance-free soaps & detergents", "Avoid wool fabrics against skin",
                               "Moisturise with emollients twice daily"],
        "avoid":              ["Known allergens", "Hot showers (dilate blood vessels → worse itch)",
                               "Scratching (causes secondary infection)"],
        "emergency_signs":    ["Anaphylaxis: throat swelling, difficulty breathing, dizziness",
                               "Rapidly spreading rash with fever"]
    },
    "Conjunctivitis": {
        "medications":        ["Ciprofloxacin eye drops 0.3%", "Olopatadine eye drops 0.1%",
                               "Artificial tears", "Tobramycin ointment 0.3%"],
        "dosage":             "Ciprofloxacin: 1–2 drops every 4 hrs (bacterial); Olopatadine: 1 drop twice daily (allergic)",
        "precautions":        "Avoid touching or rubbing eyes; wash hands frequently",
        "duration":           "5–7 days (bacterial); 2–4 weeks (allergic)",
        "follow_up":          "Ophthalmologist if no improvement in 3 days on drops",
        "lifestyle_tips":     ["Use separate towels & pillowcases", "Clean eye area with clean cotton",
                               "Cold compress for relief"],
        "avoid":              ["Sharing towels, makeup", "Contact lenses during treatment",
                               "Touching eyes with unwashed hands"],
        "emergency_signs":    ["Severe eye pain", "Significant vision loss", "Chemical exposure"]
    },
    "Kidney Stone": {
        "medications":        ["Tamsulosin 0.4mg (alpha-blocker)", "Ketorolac 30mg (pain)",
                               "Potassium Citrate 10mEq", "Plenty of oral fluids"],
        "dosage":             "Tamsulosin: 0.4mg once daily to facilitate passage; Ketorolac: PRN pain",
        "precautions":        "Drink 2.5–3L water daily, strain urine to catch stone for analysis",
        "duration":           "Observation 4–6 weeks; ESWL or ureteroscopy if > 6–7mm",
        "follow_up":          "24-hour urine collection for metabolic workup; KUB X-ray follow-up",
        "lifestyle_tips":     ["Dilute lemon juice (citrate prevents calcium stones)",
                               "Low-oxalate diet (reduced spinach, nuts, chocolate)",
                               "Limit sodium to < 2g/day", "Adequate calcium in diet (not supplements)"],
        "avoid":              ["Dehydration", "Vitamin C supplements > 1g/day",
                               "High-protein diet", "Excessive sodium"],
        "emergency_signs":    ["Infection with stone (fever + flank pain — urological emergency)",
                               "Complete urinary obstruction", "Single kidney with obstruction"]
    },
    "Appendicitis": {
        "medications":        ["Cefuroxime IV 750mg (pre-op)", "Metronidazole IV 500mg",
                               "Morphine 5–10mg IV (pain)", "IV Normal Saline (fluids)"],
        "dosage":             "All medications administered under hospital supervision",
        "precautions":        "SURGICAL EMERGENCY — do not delay; NPO (nothing by mouth)",
        "duration":           "Appendectomy (laparoscopic); hospital stay 1–3 days",
        "follow_up":          "Wound check at 7–10 days; histology of appendix",
        "lifestyle_tips":     ["High-fibre diet post-recovery", "Avoid heavy lifting × 4–6 weeks"],
        "avoid":              ["ANY delay in seeking care", "Laxatives or enemas", "Heat pads on abdomen"],
        "emergency_signs":    ["Peritonitis: rigid board-like abdomen",
                               "Fever > 38°C + RIF pain + vomiting",
                               "Rebound tenderness (Blumberg sign positive)"]
    },
    "Thyroid Disorder": {
        "medications":        ["Levothyroxine 50mcg (hypothyroid)", "Methimazole 10mg (hyperthyroid)",
                               "Selenium 200mcg (Hashimoto's)", "Calcium + Vitamin D"],
        "dosage":             "Levothyroxine: 50mcg once daily on empty stomach, 30 min before food",
        "precautions":        "Regular TSH tests every 6–8 weeks until stable; avoid calcium near dose",
        "duration":           "Lifelong for hypothyroidism; 12–18 months for hyperthyroidism",
        "follow_up":          "Annual TSH, T3, T4; thyroid ultrasound every 1–2 years",
        "lifestyle_tips":     ["Selenium-rich foods (Brazil nuts)", "Gluten-free diet (Hashimoto's)",
                               "Avoid iodine excess", "Manage stress"],
        "avoid":              ["Calcium/iron within 4 hrs of Levothyroxine",
                               "Soy products near medication time",
                               "Excess iodine (in hyperthyroid)"],
        "emergency_signs":    ["Thyroid storm (hyperthyroid): fever, rapid HR, confusion",
                               "Myxoedema coma (severe hypothyroid): stupor, hypothermia"]
    }
}

# ══════════════════════════════════════════════════════════════════
#  DOCTOR SPECIALTIES MAPPING
# ══════════════════════════════════════════════════════════════════
SPECIALIST_INFO = {
    "General Practitioner":    {"icon": "👨‍⚕️", "avg_wait_days": 1,  "consultation_min": 15},
    "Pulmonologist":           {"icon": "🫁", "avg_wait_days": 3,  "consultation_min": 30},
    "Endocrinologist":         {"icon": "🩺", "avg_wait_days": 5,  "consultation_min": 30},
    "Cardiologist":            {"icon": "❤️", "avg_wait_days": 4,  "consultation_min": 30},
    "Infectious Disease":      {"icon": "🦠", "avg_wait_days": 2,  "consultation_min": 25},
    "Neurologist":             {"icon": "🧠", "avg_wait_days": 7,  "consultation_min": 40},
    "Rheumatologist":          {"icon": "🦴", "avg_wait_days": 7,  "consultation_min": 35},
    "Gastroenterologist":      {"icon": "🍽️", "avg_wait_days": 5,  "consultation_min": 30},
    "Haematologist":           {"icon": "🩸", "avg_wait_days": 5,  "consultation_min": 30},
    "Urologist":               {"icon": "🏥", "avg_wait_days": 4,  "consultation_min": 25},
    "Psychiatrist":            {"icon": "🧠", "avg_wait_days": 7,  "consultation_min": 45},
    "Dermatologist":           {"icon": "🌸", "avg_wait_days": 3,  "consultation_min": 20},
    "Ophthalmologist":         {"icon": "👁️", "avg_wait_days": 3,  "consultation_min": 20},
    "Nephrologist":            {"icon": "🫘", "avg_wait_days": 5,  "consultation_min": 30},
    "Surgeon":                 {"icon": "🔪", "avg_wait_days": 1,  "consultation_min": 20},
}


# ══════════════════════════════════════════════════════════════════
#  HELPER — VISUAL FORMATTING
# ══════════════════════════════════════════════════════════════════
def _banner(title: str, width: int = 68):
    border = "═" * width
    pad    = (width - len(title) - 2) // 2
    print(f"\n╔{border}╗")
    print(f"║{' ' * pad} {title} {' ' * (width - pad - len(title) - 1)}║")
    print(f"╚{border}╝\n")


def _section(title: str):
    print(f"\n  ┌─ {title} {'─' * (60 - len(title))}┐")


def _end_section():
    print(f"  └{'─' * 64}┘")


# ══════════════════════════════════════════════════════════════════
#  1. LOAD & PREPROCESS DATA
# ══════════════════════════════════════════════════════════════════
def load_and_preprocess(path: Path):
    _section("STEP 1 — Data Loading & Feature Engineering")
    logger.info(f"Loading dataset: {path}")

    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    df = pd.read_csv(path)
    logger.info(f"Loaded {len(df):,} records")

    # ── Missing value handling ─────────────────────────────────
    df = df.fillna({
        "Age": df["Age"].median() if "Age" in df else 30,
        "Gender": "Other",
        "Blood_Group": "O+",
        "Patient_Satisfaction_Rating": 4.0,
        "Booking_Time_Minutes": 10.0
    })
    df["Age"] = df["Age"].clip(0, 120)

    # ── Symptom parsing ────────────────────────────────────────
    df["Symptoms_List"] = df["Symptoms"].apply(
        lambda x: [s.strip().title() for s in str(x).split(",")]
    )

    # ── Encoders ───────────────────────────────────────────────
    disease_le = LabelEncoder()
    df["Disease_Encoded"] = disease_le.fit_transform(df["Predicted_Disease"])

    spec_le = LabelEncoder()
    df["Specialist_Encoded"] = spec_le.fit_transform(df["Recommended_Specialist"])

    mlb = MultiLabelBinarizer()
    X_sym = mlb.fit_transform(df["Symptoms_List"])

    # ── Combined features ──────────────────────────────────────
    age        = df["Age"].values.reshape(-1, 1)
    disease_f  = df["Disease_Encoded"].values.reshape(-1, 1)
    gender_enc = pd.get_dummies(df["Gender"], prefix="Gender").values
    blood_enc  = pd.get_dummies(df["Blood_Group"], prefix="BG").values

    X = np.hstack([X_sym, age, gender_enc, blood_enc, disease_f])
    y = df["Specialist_Encoded"].values

    print(f"  │  ✔ Records loaded      : {len(df):,}")
    print(f"  │  ✔ Unique specialists  : {len(spec_le.classes_)}")
    print(f"  │  ✔ Unique diseases     : {len(disease_le.classes_)}")
    print(f"  │  ✔ Symptom features    : {len(mlb.classes_)}")
    print(f"  │  ✔ Total features      : {X.shape[1]}")
    _end_section()

    return X, y, spec_le, disease_le, mlb, df


# ══════════════════════════════════════════════════════════════════
#  2. BUILD RICH DOCTOR PROFILES
# ══════════════════════════════════════════════════════════════════
def build_doctor_profiles(df: pd.DataFrame) -> dict:
    _section("STEP 2 — Building Doctor Profiles")
    logger.info("Aggregating doctor performance metrics from dataset...")

    profiles = {}

    for _, row in df.iterrows():
        doc  = str(row.get("Assigned_Doctor", "Unknown"))
        spec = str(row.get("Recommended_Specialist", "General Practitioner"))
        if doc not in profiles:
            profiles[doc] = {
                "name":                   doc,
                "specialist":             spec,
                "total_appointments":     0,
                "completed_appointments": 0,
                "cancelled_appointments": 0,
                "total_rating":           0.0,
                "rating_count":           0,
                "diseases_treated":       set(),
                "booking_times":          [],
                "experience_years":       random.randint(3, 25),   # simulated
                "hospital":               _assign_hospital(spec),
                "consultation_fee":       _assign_fee(spec),
                "available_online":       random.choice([True, False]),
                "verified":               True,
            }

        profiles[doc]["total_appointments"]     += 1
        profiles[doc]["diseases_treated"].add(str(row.get("Predicted_Disease", "")))
        profiles[doc]["booking_times"].append(float(row.get("Booking_Time_Minutes", 10)))

        status = str(row.get("Appointment_Status", ""))
        if status == "Completed":
            profiles[doc]["completed_appointments"] += 1
            rating = row.get("Patient_Satisfaction_Rating", None)
            if pd.notna(rating):
                profiles[doc]["total_rating"]  += float(rating)
                profiles[doc]["rating_count"]  += 1
        elif status in ("Cancelled", "No-Show"):
            profiles[doc]["cancelled_appointments"] += 1

    # ── Compute derived metrics ────────────────────────────────
    for doc, p in profiles.items():
        rc = p["rating_count"]
        bt = p["booking_times"]
        ta = p["total_appointments"]
        ca = p["completed_appointments"]

        p["avg_rating"]          = round(p["total_rating"] / rc, 2) if rc > 0 else 4.0
        p["avg_booking_minutes"] = round(sum(bt) / len(bt), 1)      if bt else 10
        p["completion_rate"]     = round((ca / ta) * 100, 1)        if ta > 0 else 0.0
        p["diseases_treated"]    = sorted(list(p["diseases_treated"]))
        p["performance_score"]   = _compute_performance_score(p)

    logger.info(f"Built profiles for {len(profiles)} doctors")
    print(f"  │  ✔ Doctor profiles built : {len(profiles)}")
    _end_section()
    return profiles


def _compute_performance_score(p: dict) -> float:
    """Composite score: 40% rating + 30% completion_rate + 20% experience + 10% booking speed."""
    rating_score     = (p["avg_rating"] / 5.0) * 40
    completion_score = (p["completion_rate"] / 100.0) * 30
    exp_score        = (min(p["experience_years"], 25) / 25.0) * 20
    speed_score      = (1 - min(p["avg_booking_minutes"], 60) / 60.0) * 10
    return round(rating_score + completion_score + exp_score + speed_score, 2)


def _assign_hospital(specialist: str) -> str:
    hospitals = {
        "Cardiologist":       "Apollo Heart Institute",
        "Neurologist":        "NIMHANS Centre",
        "Endocrinologist":    "Diabetex Clinic",
        "Pulmonologist":      "Chest & Allergy Hub",
        "Psychiatrist":       "Mind Wellness Centre",
        "Dermatologist":      "SkinCare Dermatology",
        "Gastroenterologist": "GastroHealth Centre",
        "Urologist":          "Urology & Kidney Clinic",
        "Surgeon":            "City Surgical Hospital",
        "Rheumatologist":     "Joint & Bone Clinic",
    }
    return hospitals.get(specialist, "City General Hospital")


def _assign_fee(specialist: str) -> int:
    fee_map = {
        "General Practitioner": 300,
        "Dermatologist":        700,
        "Pulmonologist":        900,
        "Endocrinologist":      1000,
        "Cardiologist":         1200,
        "Neurologist":          1200,
        "Psychiatrist":         1100,
        "Surgeon":              1500,
        "Rheumatologist":       950,
        "Gastroenterologist":   900,
    }
    return fee_map.get(specialist, 800)


# ══════════════════════════════════════════════════════════════════
#  3. TRAIN SPECIALIST RECOMMENDER
# ══════════════════════════════════════════════════════════════════
def train_specialist_model(X_train, y_train):
    _section("STEP 3 — Training Specialist Recommender")
    logger.info("Training RandomForest specialist recommender...")
    start = time.time()

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv,
                                scoring="f1_weighted", n_jobs=-1)

    elapsed = time.time() - start
    print(f"  │  ✔ Training time        : {elapsed:.1f}s")
    print(f"  │  ✔ CV F1 Mean          : {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    _end_section()
    logger.info(f"Specialist model trained in {elapsed:.1f}s")
    return model


# ══════════════════════════════════════════════════════════════════
#  4. EVALUATE MODEL
# ══════════════════════════════════════════════════════════════════
def evaluate_model(model, X_test, y_test, spec_le):
    _section("STEP 4 — Model Evaluation")
    y_pred = model.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)
    f1     = f1_score(y_test, y_pred, average="weighted")

    print(f"  │  ✔ Accuracy            : {acc * 100:.2f}%")
    print(f"  │  ✔ F1 Score (weighted) : {f1:.4f}")
    print(f"\n  │  Per-specialist F1:")

    report = classification_report(y_test, y_pred, target_names=spec_le.classes_, output_dict=True)
    for cls in spec_le.classes_:
        r   = report.get(cls, {})
        bar = "█" * int(r.get("f1-score", 0) * 20)
        print(f"  │  {cls:<26} F1={r.get('f1-score', 0):.2f} [{bar:<20}]")
    _end_section()
    logger.info(f"Eval done — Acc={acc*100:.2f}%, F1={f1:.4f}")
    return {"accuracy_%": round(acc * 100, 4), "f1_weighted": round(f1, 4)}


# ══════════════════════════════════════════════════════════════════
#  5. SAVE ARTIFACTS
# ══════════════════════════════════════════════════════════════════
def save_artifacts(model, spec_le, disease_le, mlb, doctor_profiles, metrics):
    _section("STEP 5 — Saving Artifacts")
    joblib.dump(model,          SPECIALIST_MODEL_PATH, compress=3)
    joblib.dump(spec_le,        SPECIALIST_LE_PATH)
    joblib.dump(disease_le,     DISEASE_LE_PATH)
    joblib.dump(mlb,            MLB_PATH)
    joblib.dump(doctor_profiles, DOCTOR_PROFILES_PATH)

    metadata = {
        "model_version":  "2.0",
        "trained_at":     datetime.now().isoformat(),
        "n_specialists":  len(spec_le.classes_),
        "n_doctors":      len(doctor_profiles),
        "n_diseases_db":  len(MEDICATION_DB),
        "specialists":    spec_le.classes_.tolist(),
        "metrics":        metrics,
    }
    DOCTOR_META_PATH.write_text(json.dumps(metadata, indent=2))

    for name, path in [
        ("Specialist model",  SPECIALIST_MODEL_PATH),
        ("Doctor profiles",   DOCTOR_PROFILES_PATH),
        ("Metadata",          DOCTOR_META_PATH),
    ]:
        sz = os.path.getsize(path)
        print(f"  │  💾  {name:<20} → {path.name:45} ({sz/1024:.1f} KB)")
    _end_section()
    logger.info("All doctor recommender artifacts saved.")


# ══════════════════════════════════════════════════════════════════
#  APPOINTMENT SLOT GENERATOR
# ══════════════════════════════════════════════════════════════════
def generate_slots(count: int = SLOTS_PER_DOCTOR, start_offset_days: int = 1) -> list:
    """Generate realistic appointment slots starting from tomorrow."""
    time_options = [
        "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
        "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM",
        "03:00 PM", "03:30 PM", "04:00 PM", "05:00 PM"
    ]
    slots  = []
    base   = datetime.now()
    used   = set()

    attempts = 0
    while len(slots) < count and attempts < count * 3:
        attempts += 1
        day_offset = random.randint(start_offset_days, start_offset_days + 10)
        d          = base + timedelta(days=day_offset)
        if d.weekday() >= 5:   # skip weekends
            continue
        t = random.choice(time_options)
        key = (d.date(), t)
        if key in used:
            continue
        used.add(key)
        slots.append({
            "slot_id":       f"SLT{d.strftime('%d%m%Y')}{len(slots)+1:02d}",
            "date":          d.strftime("%A, %d %B %Y"),
            "time":          t,
            "available":     True,
            "slot_type":     random.choice(["In-Clinic", "In-Clinic", "Telemedicine"]),
        })
    return slots[:count]


# ══════════════════════════════════════════════════════════════════
#  6. RECOMMEND FUNCTION  (real-time API integration)
# ══════════════════════════════════════════════════════════════════
def recommend(
    predicted_disease: str,
    symptoms:          list,
    age:               int  = 30,
    gender:            str  = "Male",
    blood_group:       str  = "O+",
    top_doctors_n:     int  = 3,
    include_slots:     bool = True,
) -> dict:
    """
    Full recommendation engine: Specialist + Doctors + Medications + Appointment Slots.

    Parameters
    ----------
    predicted_disease : str   — Disease predicted by disease_predictor
    symptoms          : list  — Patient symptoms
    age               : int   — Patient age
    gender            : str   — 'Male' | 'Female' | 'Other'
    blood_group       : str   — e.g. 'O+', 'A-'
    top_doctors_n     : int   — Number of top doctors to return
    include_slots     : bool  — Whether to include appointment slots

    Returns
    -------
    Comprehensive recommendation dict
    """
    # ── Load artifacts ─────────────────────────────────────────
    for p in [SPECIALIST_MODEL_PATH, SPECIALIST_LE_PATH, DISEASE_LE_PATH, MLB_PATH, DOCTOR_PROFILES_PATH]:
        if not p.exists():
            raise FileNotFoundError(
                f"Artifact not found: {p}. Run doctor-recommender.py training first."
            )

    model      = joblib.load(SPECIALIST_MODEL_PATH)
    spec_le    = joblib.load(SPECIALIST_LE_PATH)
    disease_le = joblib.load(DISEASE_LE_PATH)
    mlb        = joblib.load(MLB_PATH)
    profiles   = joblib.load(DOCTOR_PROFILES_PATH)

    t_start = time.time()

    # ── Feature vector ─────────────────────────────────────────
    known_syms  = set(mlb.classes_)
    valid_s     = [s.strip().title() for s in symptoms if s.strip().title() in known_syms]
    if not valid_s:
        valid_s = list(known_syms)[:3]   # fallback

    X_sym = mlb.transform([valid_s])
    age   = max(0, min(120, int(age)))
    age_arr    = np.array([[age]])
    gen_map    = {"Male": [1, 0, 0], "Female": [0, 1, 0], "Other": [0, 0, 1]}
    gen_arr    = np.array([gen_map.get(gender, [0, 0, 1])])
    bg_opts    = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"]
    bg_arr     = np.array([[1 if b == blood_group else 0 for b in bg_opts]])

    try:
        dis_enc = disease_le.transform([predicted_disease]).reshape(-1, 1)
    except Exception:
        dis_enc = np.array([[0]])

    X = np.hstack([X_sym, age_arr, gen_arr, bg_arr, dis_enc])

    # ── Specialist prediction ──────────────────────────────────
    proba      = model.predict_proba(X)[0]
    top3_idx   = np.argsort(proba)[::-1][:3]
    specialist = spec_le.inverse_transform([top3_idx[0]])[0]
    spec_conf  = round(float(proba[top3_idx[0]]) * 100, 2)
    spec_info  = SPECIALIST_INFO.get(specialist, {})

    alt_specialists = [
        {
            "specialist":   spec_le.inverse_transform([i])[0],
            "probability":  round(float(proba[i]) * 100, 2),
            "icon":         SPECIALIST_INFO.get(spec_le.inverse_transform([i])[0], {}).get("icon", "👨‍⚕️")
        }
        for i in top3_idx[1:]
    ]

    # ── Doctor ranking ─────────────────────────────────────────
    matching = [
        (name, info) for name, info in profiles.items()
        if info["specialist"] == specialist
    ]
    matching.sort(key=lambda x: -x[1]["performance_score"])

    top_doctors = []
    for doc_name, info in matching[:top_doctors_n]:
        doc_entry = {
            "name":                doc_name,
            "specialist":          info["specialist"],
            "hospital":            info.get("hospital", "City General Hospital"),
            "experience_years":    info.get("experience_years", 5),
            "avg_rating":          info["avg_rating"],
            "total_patients":      info["total_appointments"],
            "completion_rate":     info["completion_rate"],
            "performance_score":   info["performance_score"],
            "avg_booking_time_min": info["avg_booking_minutes"],
            "consultation_fee_inr": info.get("consultation_fee", 800),
            "available_online":    info.get("available_online", False),
            "verified":            info.get("verified", True),
            "diseases_treated":    info["diseases_treated"][:5],
        }
        if include_slots:
            doc_entry["available_slots"] = generate_slots(count=SLOTS_PER_DOCTOR)
        top_doctors.append(doc_entry)

    # ── Medication plan ────────────────────────────────────────
    med = MEDICATION_DB.get(predicted_disease, {
        "medications":     ["Consult your recommended specialist"],
        "dosage":          "As prescribed by your doctor",
        "precautions":     "Follow doctor's advice strictly",
        "duration":        "As advised",
        "follow_up":       "Schedule follow-up within 2 weeks",
        "lifestyle_tips":  ["Rest", "Stay hydrated"],
        "avoid":           ["Self-medication"],
        "emergency_signs": ["Worsening symptoms — seek emergency care"]
    })

    latency_ms = round((time.time() - t_start) * 1000, 1)

    # ── Load model version ─────────────────────────────────────
    model_version = "2.0"
    if DOCTOR_META_PATH.exists():
        with open(DOCTOR_META_PATH) as f:
            model_version = json.load(f).get("model_version", "2.0")

    return {
        "query_metadata": {
            "processed_at":   datetime.now().isoformat(),
            "latency_ms":     latency_ms,
            "model_version":  model_version,
        },
        "patient_profile": {
            "age":         age,
            "gender":      gender,
            "blood_group": blood_group,
        },
        "predicted_disease": predicted_disease,
        "specialist_recommendation": {
            "specialist":            specialist,
            "confidence_pct":        spec_conf,
            "specialist_icon":       spec_info.get("icon", "👨‍⚕️"),
            "typical_wait_days":     spec_info.get("avg_wait_days", 3),
            "consultation_duration": spec_info.get("consultation_min", 30),
            "alternative_specialists": alt_specialists,
        },
        "top_doctors": top_doctors,
        "medication_plan": {
            "medications":        med["medications"],
            "dosage_instructions": med["dosage"],
            "precautions":        med["precautions"],
            "treatment_duration": med["duration"],
            "follow_up_advice":   med.get("follow_up", "Schedule a follow-up within 2 weeks"),
            "lifestyle_tips":     med.get("lifestyle_tips", []),
            "things_to_avoid":    med.get("avoid", []),
            "emergency_warning_signs": med.get("emergency_signs", []),
        },
        "disclaimer": (
            "⚠️  This recommendation is AI-generated for informational purposes only. "
            "Always consult a qualified healthcare professional before starting, changing, "
            "or stopping any medical treatment."
        )
    }


# ══════════════════════════════════════════════════════════════════
#  MAIN — TRAINING PIPELINE
# ══════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    _banner("MEDIPREDICT — DOCTOR & MEDICATION RECOMMENDER  v2.0")
    logger.info("=" * 66)
    logger.info("Starting Doctor Recommender training pipeline")
    logger.info("=" * 66)

    pipeline_start = time.time()

    # ── Step 1: Load ────────────────────────────────────────────
    X, y, spec_le, disease_le, mlb, df = load_and_preprocess(DATASET_PATH)

    # ── Step 2: Doctor profiles ─────────────────────────────────
    doctor_profiles = build_doctor_profiles(df)

    # ── Step 3: Split ───────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    print(f"\n  🔀 Split  →  Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    # ── Step 4: Train ───────────────────────────────────────────
    model = train_specialist_model(X_train, y_train)

    # ── Step 5: Evaluate ────────────────────────────────────────
    metrics = evaluate_model(model, X_test, y_test, spec_le)

    # ── Step 6: Save ────────────────────────────────────────────
    save_artifacts(model, spec_le, disease_le, mlb, doctor_profiles, metrics)

    # ── Step 7: Live Demo Recommendation ───────────────────────
    _banner("LIVE DEMO RECOMMENDATION")
    demo_cases = [
        {
            "predicted_disease": "Diabetes",
            "symptoms":          ["Frequent Urination", "Fatigue", "Blurred Vision"],
            "age": 45, "gender": "Female", "blood_group": "A+"
        },
        {
            "predicted_disease": "Migraine",
            "symptoms":          ["Severe Headache", "Nausea", "Sensitivity To Light"],
            "age": 32, "gender": "Male", "blood_group": "O+"
        },
    ]

    for i, case in enumerate(demo_cases, 1):
        print(f"\n  ─── Recommendation #{i} — {case['predicted_disease']} {'─'*35}")
        t0     = time.time()
        result = recommend(**case, include_slots=True)
        ms     = (time.time() - t0) * 1000

        sr = result["specialist_recommendation"]
        print(f"  {sr['specialist_icon']}  Specialist  : {sr['specialist']}  "
              f"({sr['confidence_pct']}% confidence)")
        print(f"  ⏱  Typical Wait   : {sr['typical_wait_days']} business day(s)")
        print(f"  📋 Consultation   : {sr['consultation_duration']} min")

        print(f"\n  🏥 Top Doctors:")
        for d in result["top_doctors"]:
            online = "🌐 Online" if d["available_online"] else "🏥 Clinic"
            print(f"     ► {d['name']:<28} ⭐ {d['avg_rating']:.1f} | "
                  f"🎯 {d['performance_score']:.1f} pts | {d['experience_years']}y exp | "
                  f"₹{d['consultation_fee_inr']} | {online}")
            if d.get("available_slots"):
                slot0 = d["available_slots"][0]
                print(f"       Next slot: {slot0['date']}  {slot0['time']}  [{slot0['slot_type']}]")

        mp = result["medication_plan"]
        print(f"\n  💊 Medications  : {' · '.join(mp['medications'][:3])}")
        print(f"  📋 Dosage       : {mp['dosage_instructions']}")
        print(f"  ⚠️  Precautions  : {mp['precautions']}")
        print(f"  📅 Follow-up    : {mp['follow_up_advice']}")
        print(f"  ⚡ Latency      : {ms:.1f} ms")

    total = time.time() - pipeline_start
    _banner(f"PIPELINE COMPLETE  ✅  ({total:.1f}s total)")
    logger.info(f"Full doctor recommender pipeline completed in {total:.1f}s")