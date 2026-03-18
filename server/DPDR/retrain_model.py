"""
DPDR Model Retrainer — Expanded 200-symptom Dataset
Run: python retrain_model.py
Generates: Training_expanded.csv + model.pkl (replaces existing)
"""
import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ──────────────────────────────────────────────────────────────────
# 1. DISEASE → SYMPTOM MAPPING  (40 diseases, 200 symptoms)
# ──────────────────────────────────────────────────────────────────
DISEASE_SYMPTOMS = {
    "Fungal infection": [
        "itching","skin_rash","nodal_skin_eruptions","skin_peeling",
        "silver_like_dusting","small_dents_in_nails","inflammatory_nails",
        "blister","red_sore_around_nose","yellow_crust_ooze","foul_smell_of_urine",
        "circular_rash","white_patches_on_skin","athlete_foot","nail_discoloration"
    ],
    "Allergy": [
        "continuous_sneezing","shivering","chills","watering_from_eyes",
        "runny_nose","congestion","skin_rash","itching","throat_irritation",
        "nasal_itching","red_eyes","swollen_eyelids","sneezing_fits","hives"
    ],
    "GERD": [
        "stomach_pain","acidity","ulcers_on_tongue","vomiting","indigestion",
        "chest_pain","belching","sour_taste_in_mouth","burning_chest",
        "difficulty_swallowing","chronic_cough","nausea","hoarseness"
    ],
    "Chronic cholestasis": [
        "itching","vomiting","yellowish_skin","nausea","loss_of_appetite",
        "abdominal_pain","yellowing_of_eyes","dark_urine","pale_stools",
        "fatigue","weight_loss","right_upper_quadrant_pain"
    ],
    "Drug Reaction": [
        "itching","skin_rash","stomach_pain","vomiting","nausea",
        "swollen_lymph_nodes","fever","joint_pain","blisters","redness",
        "facial_swelling","hives","difficulty_breathing"
    ],
    "Peptic ulcer disease": [
        "vomiting","abdominal_pain","nausea","loss_of_appetite",
        "indigestion","black_tarry_stools","burning_stomach_pain",
        "blood_in_stool","stomach_fullness","hunger_pain"
    ],
    "AIDS": [
        "muscle_wasting","patches_in_throat","high_fever","extra_marital_contacts",
        "fatigue","weight_loss","persistent_cough","night_sweats",
        "swollen_lymph_nodes","oral_thrush","frequent_infections","diarrhea"
    ],
    "Diabetes": [
        "fatigue","weight_loss","restlessness","lethargy","irregular_sugar_level",
        "blurred_vision","excessive_hunger","polyuria","increased_thirst",
        "slow_healing_wounds","numbness_in_feet","frequent_urination","blurry_eyes"
    ],
    "Gastroenteritis": [
        "vomiting","sunken_eyes","dehydration","diarrhoea","stomach_pain",
        "nausea","fever","abdominal_cramps","muscle_aches","headache",
        "loss_of_appetite","bloody_diarrhea"
    ],
    "Bronchial Asthma": [
        "fatigue","cough","high_fever","breathlessness","sweating",
        "wheezing","chest_tightness","shortness_of_breath","mucus_production",
        "nocturnal_cough","fast_heart_rate","anxiety_attacks"
    ],
    "Hypertension": [
        "headache","chest_pain","dizziness","loss_of_balance","lack_of_concentration",
        "nosebleed","blurred_vision","fast_heart_rate","palpitations",
        "shortness_of_breath","neck_pain","facial_flushing"
    ],
    "Migraine": [
        "headache","blurred_and_distorted_vision","excessive_hunger","stiff_neck",
        "depression","irritability","visual_disturbances","throbbing_headache",
        "light_sensitivity","sound_sensitivity","nausea","vomiting","aura"
    ],
    "Cervical spondylosis": [
        "back_pain","weakness_in_limbs","neck_pain","dizziness","loss_of_balance",
        "numbness_in_arms","shoulder_pain","muscle_spasm","stiff_neck",
        "tingling_in_hands","headache_from_neck"
    ],
    "Paralysis (brain hemorrhage)": [
        "vomiting","headache","weakness_of_one_body_side","altered_sensorium",
        "sudden_confusion","vision_loss","loss_of_speech","severe_headache",
        "loss_of_balance","facial_drooping","arm_weakness"
    ],
    "Jaundice": [
        "itching","vomiting","fatigue","weight_loss","high_fever",
        "yellowish_skin","dark_urine","abdominal_pain","yellowing_of_eyes",
        "pale_stools","nausea","loss_of_appetite"
    ],
    "Malaria": [
        "chills","vomiting","high_fever","sweating","headache","nausea",
        "muscle_pain","fatigue","diarrhoea","shivering","malaise",
        "cyclical_fever","spleen_pain"
    ],
    "Chicken pox": [
        "itching","skin_rash","fatigue","lethargy","high_fever","headache",
        "loss_of_appetite","mild_fever","swelled_lymph_nodes","red_spots",
        "blister_rash","crusting_lesions","vesicles"
    ],
    "Dengue": [
        "skin_rash","chills","joint_pain","vomiting","fatigue","high_fever",
        "headache","nausea","loss_of_appetite","pain_behind_the_eyes",
        "bleeding_gums","severe_myalgia","rash_after_fever"
    ],
    "Typhoid": [
        "chills","vomiting","fatigue","high_fever","headache","nausea",
        "constipation","abdominal_pain","toxic_look","belly_pain",
        "rose_spots","diarrhea_typhoid","relative_bradycardia"
    ],
    "Hepatitis A": [
        "joint_pain","vomiting","yellowish_skin","dark_urine","nausea",
        "loss_of_appetite","abdominal_pain","yellowing_of_eyes","fatigue",
        "pale_stools","fever","right_upper_quadrant_pain"
    ],
    "Hepatitis B": [
        "itching","fatigue","lethargy","yellowish_skin","dark_urine","loss_of_appetite",
        "abdominal_pain","yellowing_of_eyes","malaise","receiving_blood_transfusion",
        "receiving_unsterile_injections","nausea","vomiting","joint_pain"
    ],
    "Hepatitis C": [
        "fatigue","yellowish_skin","nausea","loss_of_appetite","yellowing_of_eyes",
        "receiving_blood_transfusion","receiving_unsterile_injections",
        "family_history","abdominal_pain","dark_urine","jaundice","weakness"
    ],
    "Hepatitis D": [
        "joint_pain","vomiting","fatigue","yellowish_skin","dark_urine","nausea",
        "loss_of_appetite","abdominal_pain","yellowing_of_eyes","mud_colored_stools"
    ],
    "Hepatitis E": [
        "joint_pain","vomiting","fatigue","high_fever","yellowish_skin",
        "dark_urine","nausea","loss_of_appetite","abdominal_pain","yellowing_of_eyes",
        "acute_liver_failure","coma"
    ],
    "Alcoholic hepatitis": [
        "vomiting","yellowish_skin","abdominal_pain","swelling_of_stomach",
        "distention_of_abdomen","history_of_alcohol_consumption","fluid_overload",
        "jaundice","spider_angiomas","ascites","liver_enlargement"
    ],
    "Tuberculosis": [
        "chills","vomiting","fatigue","weight_loss","cough","high_fever",
        "breathlessness","sweating","loss_of_appetite","mild_fever","blood_in_sputum",
        "rusty_sputum","night_sweats","chest_pain","prolonged_cough"
    ],
    "Common Cold": [
        "continuous_sneezing","chills","fatigue","cough","high_fever","headache",
        "swelled_lymph_nodes","malaise","phlegm","throat_irritation","redness_of_eyes",
        "sinus_pressure","runny_nose","congestion","body_aches","mild_fever"
    ],
    "Pneumonia": [
        "chills","fatigue","cough","high_fever","breathlessness","sweating",
        "malaise","phlegm","rusty_sputum","chest_pain","fast_heart_rate",
        "productive_cough","rigors","pleuritic_pain"
    ],
    "Dimorphic hemmorhoids (piles)": [
        "constipation","pain_during_bowel_movements","pain_in_anal_region",
        "bloody_stool","irritation_in_anus","rectal_bleeding","prolapsed_hemorrhoids",
        "mucus_in_stool","anal_itching","perineal_discomfort"
    ],
    "Heart attack": [
        "vomiting","breathlessness","sweating","chest_pain","fast_heart_rate",
        "palpitations","radiating_arm_pain","jaw_pain","cold_sweat",
        "shoulder_pain","indigestion_like_pain","sudden_dizziness"
    ],
    "Varicose veins": [
        "fatigue","cramps","bruising","obesity","swollen_blood_vessels",
        "prominent_veins_on_calf","leg_heaviness","ankle_swelling",
        "itching_veins","aching_legs","skin_discoloration_legs","restless_legs"
    ],
    "Hypothyroidism": [
        "fatigue","weight_gain","cold_hands_and_feets","constipation","puffy_face_and_eyes",
        "enlarged_thyroid","brittle_nails","swollen_extremeties","depression",
        "hair_loss","dry_skin","hoarse_voice","muscle_weakness","slow_heart_rate"
    ],
    "Hyperthyroidism": [
        "fatigue","mood_swings","weight_loss","restlessness","sweating","fast_heart_rate",
        "excessive_hunger","diarrhoea","enlarged_thyroid","muscle_weakness",
        "tremors","heat_intolerance","bulging_eyes","irregular_heartbeat"
    ],
    "Hypoglycemia": [
        "vomiting","fatigue","sweating","anxiety","excessive_hunger",
        "irregular_sugar_level","palpitations","shakiness","dizziness","confusion",
        "pale_skin","rapid_heartbeat","headache","irritability"
    ],
    "Osteoarthritis": [
        "joint_pain","knee_pain","hip_joint_pain","swelling_joints","movement_stiffness",
        "painful_walking","bone_spurs","crepitus","joint_stiffness_morning",
        "reduced_range_of_motion","muscle_weakness","bony_enlargement"
    ],
    "Arthritis": [
        "muscle_weakness","swelling_joints","movement_stiffness","loss_of_appetite",
        "restraining_activities","fatigue","joint_pain","morning_stiffness",
        "symmetric_joint_involvement","skin_nodules","anemia","fever_arthritis"
    ],
    "Vertigo": [
        "headache","loss_of_balance","spinning_movements","unsteadiness","vomiting",
        "nausea","altered_sensorium","dizziness","ear_ringing","hearing_loss",
        "nystagmus","motion_sickness"
    ],
    "Acne": [
        "skin_rash","pus_filled_pimples","blackheads","scurring","whiteheads",
        "oily_skin","comedones","papules","nodules_under_skin","facial_redness",
        "scarring"
    ],
    "Urinary tract infection": [
        "burning_micturition","bladder_discomfort","foul_smell_of_urine",
        "continuous_feel_of_urine","cloudy_urine","frequent_urination",
        "pelvic_pain","blood_in_urine","low_grade_fever","painful_urination"
    ],
    "Psoriasis": [
        "skin_rash","joint_pain","skin_peeling","silver_like_dusting","small_dents_in_nails",
        "inflammatory_nails","red_scaly_patches","plaque_formation","nail_pitting",
        "dry_cracked_skin","itching","burning_skin"
    ],
    "Impetigo": [
        "skin_rash","blister","red_sore_around_nose","yellow_crust_ooze",
        "itching","honey_colored_crust","spreading_sores","fluid_filled_blisters",
        "crusting","oozing_lesions"
    ],
}

# ──────────────────────────────────────────────────────────────────
# 2. COLLECT ALL UNIQUE SYMPTOMS
# ──────────────────────────────────────────────────────────────────
all_symptoms_set = set()
for syms in DISEASE_SYMPTOMS.values():
    all_symptoms_set.update(syms)

ALL_SYMPTOMS = sorted(list(all_symptoms_set))
print(f"Total unique symptoms: {len(ALL_SYMPTOMS)}")
print(f"Total diseases: {len(DISEASE_SYMPTOMS)}")

# ──────────────────────────────────────────────────────────────────
# 3. GENERATE TRAINING DATA
# ──────────────────────────────────────────────────────────────────
SAMPLES_PER_DISEASE = 120  # each disease gets 120 training samples
rows = []

np.random.seed(42)

for disease, core_symptoms in DISEASE_SYMPTOMS.items():
    for i in range(SAMPLES_PER_DISEASE):
        row = {sym: 0 for sym in ALL_SYMPTOMS}

        # Guarantee at least 60% of core symptoms per sample
        n_core = max(3, int(len(core_symptoms) * 0.6))
        present_core = np.random.choice(core_symptoms, size=min(n_core, len(core_symptoms)), replace=False)
        for s in present_core:
            if s in row:
                row[s] = 1

        # Add 0–3 random noise symptoms
        n_noise = np.random.randint(0, 4)
        noise_pool = [s for s in ALL_SYMPTOMS if s not in core_symptoms]
        if noise_pool and n_noise > 0:
            for s in np.random.choice(noise_pool, size=min(n_noise, len(noise_pool)), replace=False):
                row[s] = 1

        row['prognosis'] = disease
        rows.append(row)

df = pd.DataFrame(rows)
print(f"Dataset shape: {df.shape}")

# ──────────────────────────────────────────────────────────────────
# 4. TRAIN MODEL
# ──────────────────────────────────────────────────────────────────
X = df[ALL_SYMPTOMS]
y = df['prognosis']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = RandomForestClassifier(
    n_estimators=200,
    max_depth=None,
    min_samples_split=2,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

acc = accuracy_score(y_test, model.predict(X_test))
print(f"Test Accuracy: {acc * 100:.1f}%")

# ──────────────────────────────────────────────────────────────────
# 5. SAVE MODEL + NEW CSV
# ──────────────────────────────────────────────────────────────────
model_path = os.path.join(BASE_DIR, "model.pkl")
csv_path   = os.path.join(BASE_DIR, "Training.csv")

with open(model_path, 'wb') as f:
    pickle.dump(model, f)
print(f"✅ Model saved → {model_path}")

df.to_csv(csv_path, index=False)
print(f"✅ Training.csv saved → {csv_path}")
print(f"\n📋 Summary:")
print(f"   Symptoms  : {len(ALL_SYMPTOMS)}")
print(f"   Diseases  : {len(DISEASE_SYMPTOMS)}")
print(f"   Rows      : {len(df)}")
print(f"   Accuracy  : {acc * 100:.1f}%")
