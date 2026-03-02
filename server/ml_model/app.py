"""
================================================================
  app.py  —  Doctor Appointment & Recommendation API
  ─────────────────────────────────────────────────────────────
  Flask REST API that serves the two trained ML models:
    POST /api/predict          → Predict disease from symptoms
    POST /api/recommend        → Get specialist + doctors + meds
    POST /api/full-diagnosis   → Combined pipeline (predict + recommend)
    GET  /api/symptoms         → List all known symptoms
    GET  /api/diseases         → List all diseases
    GET  /api/doctors          → List all doctors (optionally filter by specialist)
    GET  /api/health           → Health check / model status
  ─────────────────────────────────────────────────────────────
  Usage:
      python trainer.py          # train models first (once)
      python app.py              # start API server
      Open: http://localhost:5000
================================================================
"""

import os
import json
import numpy as np
import joblib
from datetime import datetime, timedelta
import random

from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)

# ─────────────────────────────────────────────────────────────
#  ARTIFACT PATHS  (must match trainer.py)
# ─────────────────────────────────────────────────────────────
ARTIFACTS = {
    "disease_model":    "disease_predictor_model.pkl",
    "disease_le":       "disease_label_encoder.pkl",
    "symptom_mlb":      "symptom_mlb.pkl",
    "specialist_model": "specialist_recommender_model.pkl",
    "specialist_le":    "specialist_label_encoder.pkl",
    "disease_le_rec":   "disease_le_for_recommender.pkl",
    "symptom_mlb_rec":  "symptom_mlb_recommender.pkl",
    "doctor_profiles":  "doctor_profiles.pkl",
}

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
                         "precautions": "Low-sodium diet, no smoking, reduce stress, monitor BP", "duration": "Lifelong management"},
    "Asthma":           {"medications": ["Salbutamol Inhaler (100mcg)", "Budesonide Inhaler (200mcg)", "Montelukast 10mg", "Prednisolone 5mg"],
                         "dosage": "Salbutamol 2 puffs as needed | Budesonide 1 puff twice daily",
                         "precautions": "Avoid triggers (dust, smoke, pollen), always carry inhaler", "duration": "Ongoing management"},
    "Malaria":          {"medications": ["Artemether-Lumefantrine (80/480mg)", "Chloroquine 250mg", "Primaquine 15mg", "Paracetamol 500mg"],
                         "dosage": "Artemether-Lumefantrine: 4 tablets twice daily for 3 days",
                         "precautions": "Complete full course, use mosquito nets, stay hydrated", "duration": "3–7 days"},
    "Dengue":           {"medications": ["Paracetamol 500mg", "Oral Rehydration Salts (ORS)", "Vitamin C 500mg"],
                         "dosage": "Paracetamol 500mg every 6 hrs (avoid NSAIDs/Aspirin)",
                         "precautions": "Avoid Ibuprofen/Aspirin, monitor platelet count daily", "duration": "7–10 days"},
    "Typhoid":          {"medications": ["Azithromycin 500mg", "Ciprofloxacin 500mg", "Cefixime 200mg", "ORS"],
                         "dosage": "Azithromycin 500mg once daily for 7 days",
                         "precautions": "Boiled/safe water only, avoid outside food, maintain hygiene", "duration": "7–14 days"},
    "Pneumonia":        {"medications": ["Amoxicillin 500mg", "Azithromycin 500mg", "Dextromethorphan syrup", "Paracetamol 500mg"],
                         "dosage": "Amoxicillin 500mg three times daily for 7 days",
                         "precautions": "Rest, deep breathing exercises, stay warm and hydrated", "duration": "7–14 days"},
    "Migraine":         {"medications": ["Sumatriptan 50mg", "Ibuprofen 400mg", "Topiramate 25mg (preventive)", "Amitriptyline 10mg"],
                         "dosage": "Sumatriptan 50mg at onset; may repeat after 2 hours",
                         "precautions": "Avoid triggers (light, stress, certain foods), rest in dark room", "duration": "Per episode; preventive therapy ongoing"},
    "Arthritis":        {"medications": ["Ibuprofen 400mg", "Methotrexate 7.5mg", "Hydroxychloroquine 200mg", "Diclofenac gel 1%"],
                         "dosage": "Ibuprofen 400mg three times daily with food",
                         "precautions": "Physiotherapy, gentle exercise, avoid joint strain", "duration": "Lifelong management"},
    "Gastritis":        {"medications": ["Omeprazole 20mg", "Pantoprazole 40mg", "Antacid (Gelusil)", "Domperidone 10mg"],
                         "dosage": "Omeprazole 20mg once daily before breakfast",
                         "precautions": "Avoid spicy/oily food, alcohol, coffee; eat small frequent meals", "duration": "2–4 weeks"},
    "Anemia":           {"medications": ["Ferrous Sulfate 200mg", "Folic Acid 5mg", "Vitamin B12 1000mcg injection", "Vitamin C 500mg"],
                         "dosage": "Ferrous Sulfate 200mg twice daily with Vitamin C",
                         "precautions": "Iron-rich diet, avoid tea/coffee with meals", "duration": "3–6 months"},
    "UTI":              {"medications": ["Nitrofurantoin 100mg", "Trimethoprim 200mg", "Ciprofloxacin 250mg", "Cranberry supplements"],
                         "dosage": "Nitrofurantoin 100mg twice daily for 5 days",
                         "precautions": "Drink 2–3L water daily, maintain hygiene", "duration": "5–7 days"},
    "Depression":       {"medications": ["Sertraline 50mg", "Fluoxetine 20mg", "Escitalopram 10mg", "Clonazepam 0.5mg"],
                         "dosage": "Sertraline 50mg once daily (morning)",
                         "precautions": "Do not stop suddenly; CBT therapy strongly recommended", "duration": "6–12 months"},
    "Anxiety Disorder": {"medications": ["Buspirone 10mg", "Sertraline 50mg", "Alprazolam 0.25mg (short-term)", "Propranolol 10mg"],
                         "dosage": "Buspirone 10mg twice daily",
                         "precautions": "CBT recommended, avoid caffeine and alcohol", "duration": "6–12 months"},
    "Skin Allergy":     {"medications": ["Cetirizine 10mg", "Loratadine 10mg", "Hydrocortisone cream 1%", "Calamine lotion"],
                         "dosage": "Cetirizine 10mg once daily at night",
                         "precautions": "Identify and avoid allergens, use hypoallergenic products", "duration": "1–2 weeks"},
    "Conjunctivitis":   {"medications": ["Ciprofloxacin eye drops 0.3%", "Olopatadine eye drops 0.1%", "Artificial tears", "Tobramycin ointment 0.3%"],
                         "dosage": "Ciprofloxacin drops: 1–2 drops every 4 hours",
                         "precautions": "Avoid touching eyes, wash hands frequently, no sharing towels", "duration": "5–7 days"},
    "Kidney Stone":     {"medications": ["Tamsulosin 0.4mg", "Ketorolac 30mg", "Potassium Citrate 10mEq", "Increased fluid intake"],
                         "dosage": "Tamsulosin 0.4mg once daily",
                         "precautions": "Drink 2–3L water daily, low-oxalate diet", "duration": "Varies; surgery if >6mm"},
    "Appendicitis":     {"medications": ["Cefuroxime IV", "Metronidazole IV", "Morphine (pain)", "IV Fluids"],
                         "dosage": "Administered under hospital supervision",
                         "precautions": "Requires urgent appendectomy surgery", "duration": "Hospitalization 2–5 days"},
    "Thyroid Disorder": {"medications": ["Levothyroxine 50mcg", "Methimazole 10mg", "Selenium 200mcg", "Calcium/Vitamin D"],
                         "dosage": "Levothyroxine 50mcg once daily on empty stomach",
                         "precautions": "Regular TSH tests, avoid calcium/iron near dose time", "duration": "Lifelong management"},
}

# ─────────────────────────────────────────────────────────────
#  MODEL REGISTRY  (loaded once at startup)
# ─────────────────────────────────────────────────────────────
models = {}

def load_models():
    """Load all trained ML artifacts into memory."""
    missing = [k for k, v in ARTIFACTS.items() if not os.path.exists(v)]
    if missing:
        print(f"⚠️  Missing artifacts: {missing}")
        print("   Run: python trainer.py  — to train models first.")
        return False
    for key, path in ARTIFACTS.items():
        models[key] = joblib.load(path)
    print(f"✅ Loaded {len(models)} model artifacts.")
    return True

MODELS_LOADED = load_models()

# ─────────────────────────────────────────────────────────────
#  FEATURE BUILDER
# ─────────────────────────────────────────────────────────────
def build_feature_vector(symptoms, age, gender, blood_group, mlb, include_disease=False, disease=None, disease_le=None):
    X_sym   = mlb.transform([symptoms])
    age_arr = np.array([[age]])
    gm      = {"Male": [1, 0, 0], "Female": [0, 1, 0], "Other": [0, 0, 1]}
    g_arr   = np.array([gm.get(gender, [0, 0, 1])])
    bg_opts = ["A+", "A-", "AB+", "AB-", "B+", "B-", "O+", "O-"]
    bg_arr  = np.array([[1 if b == blood_group else 0 for b in bg_opts]])
    parts   = [X_sym, age_arr, g_arr, bg_arr]
    if include_disease and disease and disease_le:
        try:
            dis_enc = disease_le.transform([disease]).reshape(-1, 1)
        except Exception:
            dis_enc = np.array([[0]])
        parts.append(dis_enc)
    return np.hstack(parts)


# ─────────────────────────────────────────────────────────────
#  APPOINTMENT SLOT GENERATOR
# ─────────────────────────────────────────────────────────────
def generate_slots(count=5):
    slots, base = [], datetime.now()
    time_options = ["09:00 AM", "10:30 AM", "12:00 PM", "02:00 PM", "03:30 PM", "05:00 PM"]
    for i in range(1, count + 1):
        d = base + timedelta(days=i)
        slots.append({
            "date": d.strftime("%A, %d %B %Y"),
            "time": random.choice(time_options),
            "slot_id": f"SLT{d.strftime('%d%m%Y')}{i:02d}"
        })
    return slots


# ─────────────────────────────────────────────────────────────
#  LANDING PAGE (simple HTML dashboard)
# ─────────────────────────────────────────────────────────────
HOME_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Doctor Appointment & Disease Prediction API</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: #f0f4f8; color: #2d3748; }
    header { background: linear-gradient(135deg, #1a73e8, #0d47a1); color: white; padding: 40px 60px; }
    header h1 { font-size: 2rem; margin-bottom: 6px; }
    header p  { opacity: 0.85; font-size: 1rem; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 14px; font-size: 0.8rem; margin-top: 10px; }
    main { max-width: 960px; margin: 40px auto; padding: 0 20px; }
    .status { background: white; border-radius: 12px; padding: 20px 28px; margin-bottom: 30px;
              border-left: 5px solid #22c55e; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .status h2 { color: #16a34a; margin-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .card h3 { color: #1a73e8; margin-bottom: 14px; font-size: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .endpoint { margin-bottom: 12px; }
    .method { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 0.75rem;
              font-weight: bold; margin-right: 8px; }
    .post { background: #dbeafe; color: #1e40af; }
    .get  { background: #dcfce7; color: #166534; }
    .url  { font-family: monospace; font-size: 0.9rem; color: #374151; }
    .desc { font-size: 0.83rem; color: #6b7280; margin-top: 4px; }
    .body { font-family: monospace; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 16px; font-size: 0.82rem; color: #374151; overflow-x: auto; white-space: pre; }
    footer { text-align: center; padding: 30px; color: #9ca3af; font-size: 0.85rem; }
  </style>
</head>
<body>
  <header>
    <h1>🏥 Doctor Appointment & Disease Prediction</h1>
    <p>ML-powered REST API — Disease Predictor + Specialist & Medication Recommender</p>
    <span class="badge">v1.0  |  Flask + scikit-learn  |  20 Diseases  |  14 Specialists</span>
  </header>

  <main>
    <div class="status">
      <h2>✅ API is Online</h2>
      <p>All models loaded and ready. Use the endpoints below to get started.</p>
    </div>

    <div class="grid">
      <!-- POST endpoints -->
      <div class="card">
        <h3>🔬 Prediction &amp; Recommendation Endpoints</h3>

        <div class="endpoint">
          <span class="method post">POST</span>
          <span class="url">/api/predict</span>
          <div class="desc">Predict disease from symptoms</div>
        </div>
        <div class="body">{
  "symptoms": ["Fever", "Cough", "Fatigue"],
  "age": 28,
  "gender": "Male",
  "blood_group": "B+"
}</div>

        <br>
        <div class="endpoint">
          <span class="method post">POST</span>
          <span class="url">/api/recommend</span>
          <div class="desc">Get specialist, doctors &amp; medications for a known disease</div>
        </div>
        <div class="body">{
  "disease": "Diabetes",
  "symptoms": ["Fatigue", "Blurred Vision"],
  "age": 45,
  "gender": "Female",
  "blood_group": "A+"
}</div>

        <br>
        <div class="endpoint">
          <span class="method post">POST</span>
          <span class="url">/api/full-diagnosis</span>
          <div class="desc">Full pipeline: predict disease → recommend specialist + doctor + meds</div>
        </div>
        <div class="body">{
  "symptoms": ["Chest Pain", "Shortness of Breath"],
  "age": 52,
  "gender": "Male",
  "blood_group": "O-"
}</div>
      </div>

      <!-- GET endpoints -->
      <div class="card">
        <h3>📋 Reference &amp; Utility Endpoints</h3>

        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="url">/api/health</span>
          <div class="desc">Check API health &amp; model status</div>
        </div>

        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="url">/api/symptoms</span>
          <div class="desc">List all known symptoms the model understands</div>
        </div>

        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="url">/api/diseases</span>
          <div class="desc">List all 20 predictable diseases</div>
        </div>

        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="url">/api/doctors</span>
          <div class="desc">List all doctors. Filter: <code>?specialist=Cardiologist</code></div>
        </div>

        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="url">/api/specialists</span>
          <div class="desc">List all available specialists</div>
        </div>

        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="url">/api/medication/&lt;disease&gt;</span>
          <div class="desc">Get medication info for a specific disease</div>
        </div>

        <div class="endpoint">
          <span class="method get">GET</span>
          <span class="url">/api/slots/&lt;doctor_name&gt;</span>
          <div class="desc">Get available appointment slots for a doctor</div>
        </div>
      </div>
    </div>
  </main>

  <footer>Doctor Appointment & Recommendation System &mdash; Disease Prediction App</footer>
</body>
</html>
"""

# ─────────────────────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return render_template_string(HOME_HTML)


# ── Health Check ─────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "models_loaded": MODELS_LOADED,
        "artifacts": {k: os.path.exists(v) for k, v in ARTIFACTS.items()},
        "diseases": len(MEDICATION_DB),
        "timestamp": datetime.now().isoformat()
    })


# ── List Symptoms ─────────────────────────────────────────────
@app.route("/api/symptoms", methods=["GET"])
def list_symptoms():
    if not MODELS_LOADED:
        return jsonify({"error": "Models not loaded. Run trainer.py first."}), 503
    symptoms = sorted(models["symptom_mlb"].classes_.tolist())
    return jsonify({"total": len(symptoms), "symptoms": symptoms})


# ── List Diseases ─────────────────────────────────────────────
@app.route("/api/diseases", methods=["GET"])
def list_diseases():
    if not MODELS_LOADED:
        return jsonify({"error": "Models not loaded."}), 503
    diseases = sorted(models["disease_le"].classes_.tolist())
    return jsonify({"total": len(diseases), "diseases": diseases})


# ── List Specialists ──────────────────────────────────────────
@app.route("/api/specialists", methods=["GET"])
def list_specialists():
    if not MODELS_LOADED:
        return jsonify({"error": "Models not loaded."}), 503
    specs = sorted(models["specialist_le"].classes_.tolist())
    return jsonify({"total": len(specs), "specialists": specs})


# ── List Doctors ──────────────────────────────────────────────
@app.route("/api/doctors", methods=["GET"])
def list_doctors():
    if not MODELS_LOADED:
        return jsonify({"error": "Models not loaded."}), 503
    spec_filter = request.args.get("specialist", "").strip()
    profiles = models["doctor_profiles"]
    result = []
    for doc, info in profiles.items():
        if spec_filter and info["specialist"].lower() != spec_filter.lower():
            continue
        result.append({
            "name": info["name"],
            "specialist": info["specialist"],
            "avg_rating": info["avg_rating"],
            "total_appointments": info["total_appointments"],
            "completed_appointments": info["completed"],
            "avg_booking_time_min": info["avg_booking_minutes"],
            "diseases_treated": info["diseases_treated"]
        })
    result.sort(key=lambda x: -x["avg_rating"])
    return jsonify({"total": len(result), "doctors": result})


# ── Medication Info ───────────────────────────────────────────
@app.route("/api/medication/<disease>", methods=["GET"])
def medication_info(disease):
    info = MEDICATION_DB.get(disease)
    if not info:
        available = list(MEDICATION_DB.keys())
        return jsonify({"error": f"Disease '{disease}' not found.", "available_diseases": available}), 404
    return jsonify({"disease": disease, **info})


# ── Appointment Slots ─────────────────────────────────────────
@app.route("/api/slots/<doctor_name>", methods=["GET"])
def appointment_slots(doctor_name):
    if not MODELS_LOADED:
        return jsonify({"error": "Models not loaded."}), 503
    profiles = models["doctor_profiles"]
    if doctor_name not in profiles:
        return jsonify({"error": f"Doctor '{doctor_name}' not found."}), 404
    slots = generate_slots(count=6)
    return jsonify({
        "doctor": doctor_name,
        "specialist": profiles[doctor_name]["specialist"],
        "available_slots": slots
    })


# ── Predict Disease ───────────────────────────────────────────
@app.route("/api/predict", methods=["POST"])
def predict_disease():
    if not MODELS_LOADED:
        return jsonify({"error": "Models not loaded. Run trainer.py first."}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400

    symptoms    = data.get("symptoms", [])
    age         = int(data.get("age", 30))
    gender      = data.get("gender", "Male")
    blood_group = data.get("blood_group", "O+")

    if not symptoms or not isinstance(symptoms, list):
        return jsonify({"error": "'symptoms' must be a non-empty list."}), 400

    # Validate / filter known symptoms
    known       = set(models["symptom_mlb"].classes_)
    valid_syms  = [s.strip() for s in symptoms if s.strip() in known]
    unknown_syms = [s.strip() for s in symptoms if s.strip() not in known]

    if not valid_syms:
        return jsonify({
            "error": "None of the provided symptoms are recognized.",
            "unknown_symptoms": unknown_syms,
            "hint": "Call GET /api/symptoms for the full list."
        }), 422

    X = build_feature_vector(valid_syms, age, gender, blood_group, models["symptom_mlb"])
    proba    = models["disease_model"].predict_proba(X)[0]
    top5_idx = np.argsort(proba)[::-1][:5]
    le       = models["disease_le"]

    return jsonify({
        "input": {"symptoms": valid_syms, "age": age, "gender": gender, "blood_group": blood_group},
        "unknown_symptoms": unknown_syms,
        "predicted_disease": le.inverse_transform([top5_idx[0]])[0],
        "confidence_%": round(proba[top5_idx[0]] * 100, 2),
        "top_5_predictions": [
            {"disease": le.inverse_transform([i])[0], "probability_%": round(proba[i] * 100, 2)}
            for i in top5_idx
        ]
    })


# ── Recommend Specialist + Doctors + Meds ────────────────────
@app.route("/api/recommend", methods=["POST"])
def recommend():
    if not MODELS_LOADED:
        return jsonify({"error": "Models not loaded. Run trainer.py first."}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400

    disease     = data.get("disease", "")
    symptoms    = data.get("symptoms", [])
    age         = int(data.get("age", 30))
    gender      = data.get("gender", "Male")
    blood_group = data.get("blood_group", "O+")

    if not disease:
        return jsonify({"error": "'disease' field is required."}), 400

    known    = set(models["symptom_mlb_rec"].classes_)
    valid_s  = [s.strip() for s in symptoms if s.strip() in known]
    if not valid_s:
        valid_s = list(known)[:3]   # fallback to avoid empty transform

    X = build_feature_vector(
        valid_s, age, gender, blood_group,
        models["symptom_mlb_rec"],
        include_disease=True,
        disease=disease,
        disease_le=models["disease_le_rec"]
    )
    proba       = models["specialist_model"].predict_proba(X)[0]
    top3_idx    = np.argsort(proba)[::-1][:3]
    spec_le     = models["specialist_le"]
    specialist  = spec_le.inverse_transform([top3_idx[0]])[0]
    spec_conf   = round(proba[top3_idx[0]] * 100, 2)

    # Top doctors for this specialist
    profiles = models["doctor_profiles"]
    matching = [
        (n, i) for n, i in profiles.items()
        if i["specialist"] == specialist
    ]
    matching.sort(key=lambda x: (-x[1]["avg_rating"], x[1]["avg_booking_minutes"]))
    top_doctors = []
    for doc_name, info in matching[:3]:
        top_doctors.append({
            "name": info["name"],
            "specialist": info["specialist"],
            "avg_rating": info["avg_rating"],
            "total_patients": info["total_appointments"],
            "avg_booking_time_min": info["avg_booking_minutes"],
            "available_slots": generate_slots(3),
            "diseases_treated": info["diseases_treated"][:6]
        })

    med = MEDICATION_DB.get(disease, {
        "medications": ["Consult the recommended specialist"],
        "dosage": "As prescribed by your doctor",
        "precautions": "Follow doctor's advice",
        "duration": "As advised"
    })

    return jsonify({
        "disease": disease,
        "recommended_specialist": specialist,
        "specialist_confidence_%": spec_conf,
        "alternative_specialists": [
            {"specialist": spec_le.inverse_transform([i])[0], "probability_%": round(proba[i]*100, 2)}
            for i in top3_idx[1:]
        ],
        "top_doctors": top_doctors,
        "medications": med["medications"],
        "dosage_instructions": med["dosage"],
        "precautions": med["precautions"],
        "treatment_duration": med["duration"]
    })


# ── Full Diagnosis Pipeline ───────────────────────────────────
@app.route("/api/full-diagnosis", methods=["POST"])
def full_diagnosis():
    """
    Combined endpoint: predict disease from symptoms,
    then immediately recommend specialist + doctors + medications.
    """
    if not MODELS_LOADED:
        return jsonify({"error": "Models not loaded. Run trainer.py first."}), 503

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON."}), 400

    symptoms    = data.get("symptoms", [])
    age         = int(data.get("age", 30))
    gender      = data.get("gender", "Male")
    blood_group = data.get("blood_group", "O+")

    if not symptoms or not isinstance(symptoms, list):
        return jsonify({"error": "'symptoms' must be a non-empty list."}), 400

    # ── Step 1: Predict disease ──────────────────────────────
    known_dis  = set(models["symptom_mlb"].classes_)
    valid_syms = [s.strip() for s in symptoms if s.strip() in known_dis]
    unknown    = [s.strip() for s in symptoms if s.strip() not in known_dis]

    if not valid_syms:
        return jsonify({
            "error": "None of the provided symptoms are recognized.",
            "unknown_symptoms": unknown,
            "hint": "Call GET /api/symptoms for the full list."
        }), 422

    X_dis    = build_feature_vector(valid_syms, age, gender, blood_group, models["symptom_mlb"])
    proba_d  = models["disease_model"].predict_proba(X_dis)[0]
    top5_d   = np.argsort(proba_d)[::-1][:5]
    le_d     = models["disease_le"]
    disease  = le_d.inverse_transform([top5_d[0]])[0]
    disease_conf = round(proba_d[top5_d[0]] * 100, 2)

    # ── Step 2: Recommend specialist ─────────────────────────
    known_rec = set(models["symptom_mlb_rec"].classes_)
    valid_rec = [s.strip() for s in symptoms if s.strip() in known_rec]
    if not valid_rec:
        valid_rec = list(known_rec)[:3]

    X_rec     = build_feature_vector(
        valid_rec, age, gender, blood_group,
        models["symptom_mlb_rec"],
        include_disease=True,
        disease=disease,
        disease_le=models["disease_le_rec"]
    )
    proba_s   = models["specialist_model"].predict_proba(X_rec)[0]
    top3_s    = np.argsort(proba_s)[::-1][:3]
    spec_le   = models["specialist_le"]
    specialist = spec_le.inverse_transform([top3_s[0]])[0]
    spec_conf  = round(proba_s[top3_s[0]] * 100, 2)

    # ── Step 3: Top doctors ──────────────────────────────────
    profiles = models["doctor_profiles"]
    matching = sorted(
        [(n, i) for n, i in profiles.items() if i["specialist"] == specialist],
        key=lambda x: (-x[1]["avg_rating"], x[1]["avg_booking_minutes"])
    )
    top_doctors = [{
        "name": i["name"], "specialist": i["specialist"],
        "avg_rating": i["avg_rating"],
        "total_patients": i["total_appointments"],
        "avg_booking_time_min": i["avg_booking_minutes"],
        "available_slots": generate_slots(3),
        "diseases_treated": i["diseases_treated"][:6]
    } for _, i in matching[:3]]

    # ── Step 4: Medications ───────────────────────────────────
    med = MEDICATION_DB.get(disease, {
        "medications": ["Consult the recommended specialist"],
        "dosage": "As prescribed", "precautions": "Follow doctor's advice", "duration": "As advised"
    })

    return jsonify({
        "patient_info": {"age": age, "gender": gender, "blood_group": blood_group},
        "symptoms_provided": valid_syms,
        "unknown_symptoms": unknown,
        "disease_prediction": {
            "predicted_disease": disease,
            "confidence_%": disease_conf,
            "top_5_predictions": [
                {"disease": le_d.inverse_transform([i])[0], "probability_%": round(proba_d[i]*100, 2)}
                for i in top5_d
            ]
        },
        "specialist_recommendation": {
            "recommended_specialist": specialist,
            "confidence_%": spec_conf,
            "alternatives": [
                {"specialist": spec_le.inverse_transform([i])[0], "probability_%": round(proba_s[i]*100, 2)}
                for i in top3_s[1:]
            ]
        },
        "top_doctors": top_doctors,
        "medication_plan": {
            "medications": med["medications"],
            "dosage_instructions": med["dosage"],
            "precautions": med["precautions"],
            "treatment_duration": med["duration"]
        },
        "disclaimer": "This is an AI-based prediction. Always consult a qualified doctor before taking any medication."
    })


# ─────────────────────────────────────────────────────────────
#  ERROR HANDLERS
# ─────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found.", "available": [
        "/", "/api/health", "/api/predict", "/api/recommend",
        "/api/full-diagnosis", "/api/symptoms", "/api/diseases",
        "/api/doctors", "/api/specialists", "/api/medication/<disease>",
        "/api/slots/<doctor_name>"
    ]}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed for this endpoint."}), 405

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error.", "details": str(e)}), 500


# ─────────────────────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\n" + "█"*55)
    print("  DOCTOR APPOINTMENT & DISEASE PREDICTION API")
    print("█"*55)
    if not MODELS_LOADED:
        print("  ⚠️  Models not found! Please run:")
        print("       python trainer.py")
        print("  Then restart app.py.")
    else:
        print("  ✅ All models loaded successfully")
        print("  🌐 Starting server at http://localhost:5001")
    print("█"*55 + "\n")
    app.run(debug=True, host="0.0.0.0", port=5001)