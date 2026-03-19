"""
╔══════════════════════════════════════════════════════════════════╗
║        MEDIPREDICT  —  Flask REST API  v2.0                     ║
║──────────────────────────────────────────────────────────────────║
║  POST /api/predict          → Predict disease from symptoms      ║
║  POST /api/recommend        → Specialist + doctors + meds        ║
║  POST /api/full-diagnosis   → Full combined pipeline             ║
║  GET  /api/symptoms         → All known symptoms                 ║
║  GET  /api/diseases         → All diseases                       ║
║  GET  /api/doctors          → All doctors (filter by specialist) ║
║  GET  /api/specialists      → All specialists                    ║
║  GET  /api/medication/<dis> → Medication for a disease           ║
║  GET  /api/slots/<doctor>   → Appointment slots                  ║
║  GET  /api/health           → Health check                       ║
║  GET  /api/stats            → Live API statistics                ║
╚══════════════════════════════════════════════════════════════════╝
"""

import os, json, time, random, logging, sys
from datetime import datetime, timedelta
from pathlib import Path
from functools import wraps
import numpy as np
import joblib

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS

# ─────────────────────────────────────────────────────────────────
#  LOGGING
# ─────────────────────────────────────────────────────────────────
LOG_DIR = Path("logs"); LOG_DIR.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_DIR / "app.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("MediPredictAPI")

# ─────────────────────────────────────────────────────────────────
#  APP INIT
# ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://localhost:5173", "*"])

APP_START   = datetime.now()
API_VERSION = "2.0.0"
REQUEST_LOG = []          # in-memory request counter (for stats)

# ─────────────────────────────────────────────────────────────────
#  ARTIFACT PATHS  (from artifacts/ sub-folder created by trainers)
# ─────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent / "model" / "artifacts"
ARTIFACTS  = {
    "disease_model":    BASE_DIR / "disease_predictor_model.pkl",
    "disease_le":       BASE_DIR / "disease_label_encoder.pkl",
    "symptom_mlb":      BASE_DIR / "symptom_mlb.pkl",
    "specialist_model": BASE_DIR / "specialist_recommender_model.pkl",
    "specialist_le":    BASE_DIR / "specialist_label_encoder.pkl",
    "disease_le_rec":   BASE_DIR / "disease_le_for_recommender.pkl",
    "symptom_mlb_rec":  BASE_DIR / "symptom_mlb_recommender.pkl",
    "doctor_profiles":  BASE_DIR / "doctor_profiles.pkl",
}

MEDICATION_DB = {
    "Flu":{"medications":["Paracetamol 500mg","Oseltamivir 75mg","Cetirizine 10mg","Ibuprofen 400mg"],"dosage":"Paracetamol 500mg every 6 hrs | Tamiflu 75mg twice daily × 5 days","precautions":"Rest, stay hydrated, avoid cold exposure","duration":"5–7 days","emergency_signs":["Fever > 39.5°C","Chest pain","Difficulty breathing"]},
    "Diabetes":{"medications":["Metformin 500mg","Glipizide 5mg","Insulin (if required)","Vitamin B12 500mcg"],"dosage":"Metformin 500mg twice daily with meals","precautions":"Monitor blood glucose, low-GI diet, regular exercise","duration":"Lifelong","emergency_signs":["Blood sugar < 70 mg/dL","Extreme thirst","Blurred vision"]},
    "Hypertension":{"medications":["Amlodipine 5mg","Losartan 50mg","Hydrochlorothiazide 25mg","Atenolol 50mg"],"dosage":"Amlodipine 5mg once daily | Losartan 50mg once daily","precautions":"Low-sodium diet, no smoking, monitor BP daily","duration":"Lifelong","emergency_signs":["BP > 180/120 mmHg","Severe headache + chest pain"]},
    "Asthma":{"medications":["Salbutamol Inhaler 100mcg","Budesonide Inhaler 200mcg","Montelukast 10mg","Prednisolone 5mg"],"dosage":"Salbutamol 2 puffs as needed | Budesonide 1 puff twice daily","precautions":"Avoid triggers (dust, smoke, pollen), always carry inhaler","duration":"Ongoing","emergency_signs":["Blue lips/fingertips","Inhaler not helping","Cannot speak due to breathlessness"]},
    "Malaria":{"medications":["Artemether-Lumefantrine 480mg","Chloroquine 250mg","Primaquine 15mg","Paracetamol 500mg"],"dosage":"Artemether-Lumefantrine: 4 tablets twice daily × 3 days","precautions":"Complete full course, use mosquito nets","duration":"3–7 days","emergency_signs":["Seizures","Altered consciousness","Severe anaemia"]},
    "Dengue":{"medications":["Paracetamol 500mg","ORS","Vitamin C 500mg","Papaya leaf extract"],"dosage":"Paracetamol 500mg every 6 hrs (avoid NSAIDs)","precautions":"Avoid Ibuprofen/Aspirin, monitor platelet count daily","duration":"7–10 days","emergency_signs":["Platelet < 20,000","Bleeding from gums/nose","Persistent vomiting"]},
    "Typhoid":{"medications":["Azithromycin 500mg","Ciprofloxacin 500mg","Cefixime 200mg","ORS"],"dosage":"Azithromycin 500mg once daily × 7 days","precautions":"Boiled water only, avoid outside food","duration":"7–14 days","emergency_signs":["Intestinal perforation","Persistent fever > 7 days","Confusion"]},
    "Pneumonia":{"medications":["Amoxicillin 500mg","Azithromycin 500mg","Dextromethorphan syrup","Paracetamol 500mg"],"dosage":"Amoxicillin 500mg three times daily × 7 days","precautions":"Rest, deep breathing exercises, stay warm","duration":"7–14 days","emergency_signs":["SpO2 < 92%","Cyanosis","Rapid breathing > 30/min"]},
    "Migraine":{"medications":["Sumatriptan 50mg","Ibuprofen 400mg","Topiramate 25mg","Amitriptyline 10mg"],"dosage":"Sumatriptan 50mg at onset; repeat after 2 hrs if needed","precautions":"Identify triggers, maintain sleep schedule","duration":"Per episode; preventive 3–6 months","emergency_signs":["Thunderclap headache","Headache + fever + stiff neck","Neurological symptoms"]},
    "Arthritis":{"medications":["Ibuprofen 400mg","Methotrexate 7.5mg","Hydroxychloroquine 200mg","Diclofenac gel 1%"],"dosage":"Ibuprofen 400mg three times daily with food","precautions":"Physiotherapy, gentle exercise, avoid joint strain","duration":"Lifelong","emergency_signs":["Severe joint pain + swelling + fever","Unable to bear weight"]},
    "Gastritis":{"medications":["Omeprazole 20mg","Pantoprazole 40mg","Antacid (Gelusil)","Domperidone 10mg"],"dosage":"Omeprazole 20mg once daily before breakfast","precautions":"Avoid spicy/oily food, alcohol, coffee","duration":"2–4 weeks","emergency_signs":["Vomiting blood","Black tarry stools","Severe abdominal pain"]},
    "Anemia":{"medications":["Ferrous Sulfate 200mg","Folic Acid 5mg","Vitamin B12 1000mcg injection","Vitamin C 500mg"],"dosage":"Ferrous Sulfate 200mg twice daily with Vitamin C","precautions":"Iron-rich diet, avoid tea/coffee with iron tablets","duration":"3–6 months","emergency_signs":["Hb < 7 g/dL","Fainting","Rapid heartbeat"]},
    "UTI":{"medications":["Nitrofurantoin 100mg","Trimethoprim 200mg","Ciprofloxacin 250mg","D-Mannose supplement"],"dosage":"Nitrofurantoin 100mg twice daily × 5 days","precautions":"Drink 2–3L water daily, maintain hygiene","duration":"5–7 days","emergency_signs":["Fever + flank pain (pyelonephritis)","Blood in urine"]},
    "Depression":{"medications":["Sertraline 50mg","Fluoxetine 20mg","Escitalopram 10mg","Mirtazapine 15mg"],"dosage":"Sertraline 50mg once daily (morning)","precautions":"Do not stop abruptly; CBT therapy strongly recommended","duration":"Minimum 6 months","emergency_signs":["Suicidal thoughts","Self-harm","Psychosis"]},
    "Anxiety Disorder":{"medications":["Buspirone 10mg","Sertraline 50mg","Alprazolam 0.25mg (short-term)","Propranolol 10mg"],"dosage":"Buspirone 10mg twice daily","precautions":"CBT recommended, avoid caffeine and alcohol","duration":"6–12 months","emergency_signs":["Panic attack with chest pain","Suicidal thoughts"]},
    "Skin Allergy":{"medications":["Cetirizine 10mg","Loratadine 10mg","Hydrocortisone cream 1%","Calamine lotion"],"dosage":"Cetirizine 10mg once daily at night","precautions":"Identify and avoid allergens, use hypoallergenic products","duration":"1–2 weeks","emergency_signs":["Throat swelling","Difficulty breathing","Rapidly spreading rash + fever"]},
    "Conjunctivitis":{"medications":["Ciprofloxacin eye drops 0.3%","Olopatadine eye drops 0.1%","Artificial tears","Tobramycin ointment 0.3%"],"dosage":"Ciprofloxacin: 1–2 drops every 4 hrs","precautions":"No touching/rubbing eyes, no sharing towels","duration":"5–7 days","emergency_signs":["Severe eye pain","Vision loss"]},
    "Kidney Stone":{"medications":["Tamsulosin 0.4mg","Ketorolac 30mg","Potassium Citrate 10mEq","Increased fluid intake"],"dosage":"Tamsulosin 0.4mg once daily","precautions":"Drink 2.5–3L water daily, low-oxalate diet","duration":"4–6 weeks observation; surgery if > 7mm","emergency_signs":["Fever + flank pain","Complete obstruction"]},
    "Appendicitis":{"medications":["Cefuroxime IV","Metronidazole IV","Morphine IV (pain)","IV Fluids"],"dosage":"Administered under hospital supervision","precautions":"SURGICAL EMERGENCY — do not delay treatment","duration":"Hospitalisation 1–3 days","emergency_signs":["Rigid abdomen","Fever + RIF pain + vomiting","Rebound tenderness"]},
    "Thyroid Disorder":{"medications":["Levothyroxine 50mcg","Methimazole 10mg","Selenium 200mcg","Calcium + Vitamin D"],"dosage":"Levothyroxine 50mcg once daily on empty stomach","precautions":"Regular TSH tests, avoid calcium near dose time","duration":"Lifelong","emergency_signs":["Thyroid storm: fever + rapid HR + confusion","Myxoedema coma"]},
}

DISEASE_RISK = {
    "Appendicitis":"Critical","Pneumonia":"Critical","Malaria":"Critical","Dengue":"Critical","Kidney Stone":"Critical",
    "Diabetes":"High","Hypertension":"High","Thyroid Disorder":"High","Asthma":"High",
    "Arthritis":"Moderate","Migraine":"Moderate","UTI":"Moderate","Typhoid":"Moderate","Flu":"Moderate",
    "Gastritis":"Low","Anemia":"Low","Skin Allergy":"Low","Conjunctivitis":"Low","Depression":"Low","Anxiety Disorder":"Low",
}

# ─────────────────────────────────────────────────────────────────
#  MODEL REGISTRY
# ─────────────────────────────────────────────────────────────────
models = {}

def load_models():
    missing = [k for k, v in ARTIFACTS.items() if not v.exists()]
    if missing:
        logger.warning(f"Missing artifacts: {missing}  → Run trainers first.")
        return False
    for key, path in ARTIFACTS.items():
        models[key] = joblib.load(path)
    logger.info(f"✅ Loaded {len(models)} model artifacts.")
    return True

MODELS_LOADED = load_models()

# ─────────────────────────────────────────────────────────────────
#  HELPERS
# ─────────────────────────────────────────────────────────────────
def build_feature_vector(symptoms, age, gender, blood_group, mlb, disease=None, disease_le=None):
    X_sym  = mlb.transform([symptoms])
    g_map  = {"Male":[1,0,0],"Female":[0,1,0],"Other":[0,0,1]}
    bg_opts= ["A+","A-","AB+","AB-","B+","B-","O+","O-"]
    parts  = [X_sym, np.array([[age]]), np.array([g_map.get(gender,[0,0,1])]),
              np.array([[1 if b==blood_group else 0 for b in bg_opts]])]
    if disease and disease_le:
        try: parts.append(disease_le.transform([disease]).reshape(-1,1))
        except: parts.append(np.array([[0]]))
    return np.hstack(parts)

def generate_slots(count=5):
    times = ["09:00 AM","09:30 AM","10:30 AM","11:00 AM","02:00 PM","03:00 PM","04:00 PM","05:00 PM"]
    slots, base, used = [], datetime.now(), set()
    for _ in range(count * 3):
        if len(slots) >= count: break
        d = base + timedelta(days=random.randint(1, 10))
        if d.weekday() >= 5: continue
        t = random.choice(times)
        if (d.date(), t) in used: continue
        used.add((d.date(), t))
        slots.append({
            "slot_id": f"SLT{d.strftime('%d%m%Y')}{len(slots)+1:02d}",
            "date": d.strftime("%A, %d %B %Y"),
            "time": t,
            "type": random.choice(["In-Clinic","In-Clinic","Telemedicine"]),
            "available": True
        })
    return slots

def track(endpoint):
    REQUEST_LOG.append({"endpoint": endpoint, "ts": datetime.now().isoformat()})
    if len(REQUEST_LOG) > 1000:
        REQUEST_LOG.pop(0)

def require_models(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not MODELS_LOADED:
            return jsonify({"error":"Models not loaded. Run disease_predictor.py and doctor-recommender.py first.","hint":"python model/disease_predictor.py && python model/doctor-recommender.py"}), 503
        return f(*args, **kwargs)
    return decorated


# ─────────────────────────────────────────────────────────────────
#  LANDING PAGE
# ─────────────────────────────────────────────────────────────────
HOME_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MediPredict API v2.0 — Doctor Recommendation System</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0a0f1e;--surface:#111827;--card:#1a2235;--border:#1e2d45;
  --primary:#3b82f6;--primary-dark:#1d4ed8;--accent:#06b6d4;
  --success:#10b981;--warn:#f59e0b;--danger:#ef4444;
  --text:#e2e8f0;--muted:#64748b;--subtle:#94a3b8;
}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
/* HERO */
.hero{background:linear-gradient(135deg,#0d1b3e 0%,#0a1628 50%,#06111f 100%);
  border-bottom:1px solid var(--border);padding:60px 40px 50px;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;
  background:radial-gradient(ellipse 80% 50% at 50% -20%,rgba(59,130,246,.18),transparent)}
.hero-inner{max-width:1100px;margin:0 auto;position:relative}
.badge-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border-radius:20px;font-size:.75rem;font-weight:600;letter-spacing:.04em}
.badge-blue{background:rgba(59,130,246,.15);color:#60a5fa;border:1px solid rgba(59,130,246,.25)}
.badge-green{background:rgba(16,185,129,.15);color:#34d399;border:1px solid rgba(16,185,129,.25)}
.badge-cyan{background:rgba(6,182,212,.15);color:#22d3ee;border:1px solid rgba(6,182,212,.25)}
h1{font-size:clamp(1.8rem,4vw,3rem);font-weight:800;letter-spacing:-.02em;
   background:linear-gradient(135deg,#60a5fa,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:10px}
.hero-sub{color:var(--subtle);font-size:1.05rem;max-width:600px;line-height:1.6}
.status-bar{display:flex;gap:20px;margin-top:28px;flex-wrap:wrap}
.stat-chip{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;display:flex;flex-direction:column;gap:2px}
.stat-chip .val{font-size:1.4rem;font-weight:700;color:var(--primary)}
.stat-chip .lbl{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.07em}
/* MAIN */
.main{max-width:1100px;margin:0 auto;padding:40px 20px}
/* HEALTH STATUS */
.health-card{background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:18px 24px;margin-bottom:32px;display:flex;align-items:center;gap:16px}
.pulse{width:12px;height:12px;border-radius:50%;animation:pulse 2s infinite}
.pulse-green{background:var(--success);box-shadow:0 0 0 0 rgba(16,185,129,.6)}
.pulse-red{background:var(--danger);box-shadow:0 0 0 0 rgba(239,68,68,.6)}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.7}}
.health-text h3{font-size:.95rem;font-weight:600;margin-bottom:2px}
.health-text p{font-size:.8rem;color:var(--muted)}
/* GRID */
.section-title{font-size:1.1rem;font-weight:700;margin-bottom:18px;color:var(--text)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:36px}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;
  transition:border-color .2s,transform .2s}
.card:hover{border-color:var(--primary);transform:translateY(-2px)}
.card h3{font-size:.9rem;font-weight:700;margin-bottom:16px;color:var(--accent);
  display:flex;align-items:center;gap:8px;padding-bottom:10px;border-bottom:1px solid var(--border)}
.endpoint{margin-bottom:14px}
.method{display:inline-block;padding:3px 10px;border-radius:6px;font-size:.7rem;font-weight:700;margin-right:8px;letter-spacing:.05em}
.POST{background:rgba(59,130,246,.2);color:#60a5fa;border:1px solid rgba(59,130,246,.3)}
.GET{background:rgba(16,185,129,.2);color:#34d399;border:1px solid rgba(16,185,129,.3)}
.ep-url{font-family:monospace;font-size:.88rem;color:var(--text)}
.ep-desc{font-size:.78rem;color:var(--muted);margin-top:3px;padding-left:4px}
/* CODE BLOCK */
.code-block{background:#0d1117;border:1px solid var(--border);border-radius:10px;
  padding:14px 16px;font-family:monospace;font-size:.78rem;color:#79c0ff;
  overflow-x:auto;white-space:pre;margin-top:8px;line-height:1.6}
/* TRY PANEL */
.try-panel{background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:28px;margin-bottom:36px}
.try-panel h3{font-size:1rem;font-weight:700;margin-bottom:20px;color:var(--text)}
.form-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:16px}
.form-group{display:flex;flex-direction:column;gap:6px}
.form-group label{font-size:.75rem;font-weight:600;color:var(--subtle);text-transform:uppercase;letter-spacing:.06em}
.form-group input,.form-group select{background:#0d1117;border:1px solid var(--border);border-radius:8px;
  padding:9px 12px;color:var(--text);font-size:.88rem;outline:none;transition:border-color .2s}
.form-group input:focus,.form-group select:focus{border-color:var(--primary)}
textarea.sym-input{background:#0d1117;border:1px solid var(--border);border-radius:8px;
  padding:10px 12px;color:var(--text);font-size:.88rem;width:100%;resize:vertical;
  min-height:60px;outline:none;font-family:inherit;transition:border-color .2s}
textarea.sym-input:focus{border-color:var(--primary)}
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:10px;
  font-size:.88rem;font-weight:600;cursor:pointer;border:none;transition:all .2s}
.btn-primary{background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff}
.btn-primary:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 4px 15px rgba(59,130,246,.3)}
.btn-secondary{background:var(--surface);border:1px solid var(--border);color:var(--subtle)}
.btn-secondary:hover{border-color:var(--primary);color:var(--text)}
.result-area{background:#0d1117;border:1px solid var(--border);border-radius:10px;
  padding:16px;font-family:monospace;font-size:.8rem;color:#a5f3fc;
  overflow:auto;min-height:80px;max-height:400px;white-space:pre;margin-top:16px;display:none}
.spinner{display:none;width:18px;height:18px;border:2px solid rgba(255,255,255,.2);
  border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
footer{text-align:center;padding:32px 20px;color:var(--muted);font-size:.8rem;
  border-top:1px solid var(--border);margin-top:20px}
footer a{color:var(--primary);text-decoration:none}
</style>
</head>
<body>
<div class="hero">
  <div class="hero-inner">
    <div class="badge-row">
      <span class="badge badge-blue">⚡ v2.0.0</span>
      <span class="badge badge-green">🟢 Live</span>
      <span class="badge badge-cyan">🧠 ML Powered</span>
      <span class="badge badge-blue">Flask + scikit-learn</span>
    </div>
    <h1>🏥 MediPredict API</h1>
    <p class="hero-sub">AI-powered disease prediction, specialist recommendation, doctor matching & medication planning — all in one REST API.</p>
    <div class="status-bar">
      <div class="stat-chip"><span class="val">20</span><span class="lbl">Diseases</span></div>
      <div class="stat-chip"><span class="val">14+</span><span class="lbl">Specialists</span></div>
      <div class="stat-chip"><span class="val">11</span><span class="lbl">Endpoints</span></div>
      <div class="stat-chip"><span class="val" id="req-count">0</span><span class="lbl">Requests</span></div>
    </div>
  </div>
</div>

<div class="main">
  <!-- Health -->
  <div class="health-card" id="health-card">
    <div class="pulse pulse-green" id="status-dot"></div>
    <div class="health-text">
      <h3 id="status-title">Checking API status…</h3>
      <p id="status-sub">Connecting to MediPredict backend</p>
    </div>
  </div>

  <!-- Try It Live -->
  <div class="try-panel">
    <h3>⚡ Try It Live — Full Diagnosis</h3>
    <div class="form-row">
      <div class="form-group" style="grid-column:1/-1">
        <label>Symptoms (comma-separated)</label>
        <textarea class="sym-input" id="try-symptoms" placeholder="e.g. Fever, Cough, Fatigue, Body Ache"></textarea>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Age</label><input type="number" id="try-age" value="30" min="1" max="100">
      </div>
      <div class="form-group">
        <label>Gender</label>
        <select id="try-gender"><option>Male</option><option>Female</option><option>Other</option></select>
      </div>
      <div class="form-group">
        <label>Blood Group</label>
        <select id="try-bg"><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select>
      </div>
    </div>
    <div style="display:flex;gap:12px;align-items:center">
      <button class="btn btn-primary" onclick="runDiagnosis()">
        <div class="spinner" id="spin"></div>
        <span id="btn-text">🔬 Run Full Diagnosis</span>
      </button>
      <button class="btn btn-secondary" onclick="clearResult()">Clear</button>
    </div>
    <pre class="result-area" id="result-area"></pre>
  </div>

  <!-- Endpoints -->
  <p class="section-title">📡 API Reference</p>
  <div class="grid">
    <div class="card">
      <h3>🔬 Prediction & Recommendation</h3>
      <div class="endpoint">
        <span class="method POST">POST</span><span class="ep-url">/api/predict</span>
        <div class="ep-desc">Predict disease from symptoms (top-5 with confidence)</div>
        <div class="code-block">{"symptoms":["Fever","Cough"],
 "age":28,"gender":"Male","blood_group":"B+"}</div>
      </div>
      <div class="endpoint">
        <span class="method POST">POST</span><span class="ep-url">/api/recommend</span>
        <div class="ep-desc">Specialist + doctors + meds for a known disease</div>
        <div class="code-block">{"disease":"Diabetes",
 "symptoms":["Fatigue"],"age":45,
 "gender":"Female","blood_group":"A+"}</div>
      </div>
      <div class="endpoint">
        <span class="method POST">POST</span><span class="ep-url">/api/full-diagnosis</span>
        <div class="ep-desc">Complete pipeline: predict → recommend → slots</div>
      </div>
    </div>
    <div class="card">
      <h3>📋 Reference Endpoints</h3>
      <div class="endpoint"><span class="method GET">GET</span><span class="ep-url">/api/health</span><div class="ep-desc">API health check & model status</div></div>
      <div class="endpoint"><span class="method GET">GET</span><span class="ep-url">/api/stats</span><div class="ep-desc">Live API request statistics</div></div>
      <div class="endpoint"><span class="method GET">GET</span><span class="ep-url">/api/symptoms</span><div class="ep-desc">All recognised symptoms</div></div>
      <div class="endpoint"><span class="method GET">GET</span><span class="ep-url">/api/diseases</span><div class="ep-desc">All 20 predictable diseases</div></div>
      <div class="endpoint"><span class="method GET">GET</span><span class="ep-url">/api/specialists</span><div class="ep-desc">All available specialists</div></div>
      <div class="endpoint"><span class="method GET">GET</span><span class="ep-url">/api/doctors</span><div class="ep-desc">All doctors (filter: ?specialist=Cardiologist)</div></div>
      <div class="endpoint"><span class="method GET">GET</span><span class="ep-url">/api/medication/&lt;disease&gt;</span><div class="ep-desc">Medication plan for a disease</div></div>
      <div class="endpoint"><span class="method GET">GET</span><span class="ep-url">/api/slots/&lt;doctor&gt;</span><div class="ep-desc">Available appointment slots</div></div>
    </div>
  </div>
</div>

<footer>MediPredict v2.0 &mdash; AI-Powered Healthcare Recommendation Engine &mdash; For informational use only</footer>

<script>
async function checkHealth(){
  try{
    const r=await fetch('/api/health');const d=await r.json();
    const ok=d.status==='ok'&&d.models_loaded;
    document.getElementById('status-dot').className='pulse '+(ok?'pulse-green':'pulse-red');
    document.getElementById('status-title').textContent=ok?'✅ API Online — All models loaded':'⚠️ API Online — Models not loaded';
    document.getElementById('status-sub').textContent=ok
      ?`${d.diseases} diseases · ${d.specialists} specialists · Uptime: ${d.uptime}`
      :'Run disease_predictor.py and doctor-recommender.py to load models';
    document.getElementById('req-count').textContent=d.total_requests||0;
  }catch(e){
    document.getElementById('status-title').textContent='❌ API Offline';
    document.getElementById('status-sub').textContent='Could not reach the server';
  }
}
async function runDiagnosis(){
  const syms=document.getElementById('try-symptoms').value.trim();
  if(!syms){alert('Please enter at least one symptom.');return;}
  const symptoms=syms.split(',').map(s=>s.trim()).filter(Boolean);
  const payload={
    symptoms,
    age:parseInt(document.getElementById('try-age').value)||30,
    gender:document.getElementById('try-gender').value,
    blood_group:document.getElementById('try-bg').value
  };
  document.getElementById('spin').style.display='block';
  document.getElementById('btn-text').textContent='Processing…';
  document.getElementById('result-area').style.display='block';
  document.getElementById('result-area').textContent='Loading…';
  try{
    const r=await fetch('/api/full-diagnosis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const d=await r.json();
    document.getElementById('result-area').textContent=JSON.stringify(d,null,2);
    document.getElementById('req-count').textContent=(parseInt(document.getElementById('req-count').textContent)||0)+1;
  }catch(e){document.getElementById('result-area').textContent='Error: '+e.message;}
  document.getElementById('spin').style.display='none';
  document.getElementById('btn-text').textContent='🔬 Run Full Diagnosis';
}
function clearResult(){
  document.getElementById('result-area').style.display='none';
  document.getElementById('result-area').textContent='';
  document.getElementById('try-symptoms').value='';
}
checkHealth();setInterval(checkHealth,30000);
</script>
</body>
</html>"""

# ─────────────────────────────────────────────────────────────────
#  REQUEST MIDDLEWARE — timing + logging
# ─────────────────────────────────────────────────────────────────
@app.before_request
def before():
    request._start = time.time()

@app.after_request
def after(response):
    ms = round((time.time() - getattr(request, "_start", time.time())) * 1000, 1)
    response.headers["X-Response-Time"] = f"{ms}ms"
    response.headers["X-API-Version"]   = API_VERSION
    response.headers["X-Powered-By"]    = "MediPredict-v2"
    if request.path.startswith("/api"):
        logger.info(f"{request.method:4} {request.path:<35} → {response.status_code} ({ms}ms)")
        track(request.path)
    return response

# ─────────────────────────────────────────────────────────────────
#  ROUTES
# ─────────────────────────────────────────────────────────────────
@app.route("/")
def home():
    return render_template_string(HOME_HTML)


@app.route("/api/health")
def health():
    uptime_s = int((datetime.now() - APP_START).total_seconds())
    h, m, s  = uptime_s//3600, (uptime_s%3600)//60, uptime_s%60
    return jsonify({
        "status":        "ok",
        "models_loaded": MODELS_LOADED,
        "api_version":   API_VERSION,
        "uptime":        f"{h:02d}:{m:02d}:{s:02d}",
        "diseases":      len(MEDICATION_DB),
        "specialists":   len(models["specialist_le"].classes_) if MODELS_LOADED else 0,
        "total_requests":len(REQUEST_LOG),
        "artifacts":     {k: v.exists() for k, v in ARTIFACTS.items()},
        "timestamp":     datetime.now().isoformat(),
    })


@app.route("/api/stats")
def stats():
    from collections import Counter
    counts = Counter(r["endpoint"] for r in REQUEST_LOG)
    return jsonify({
        "total_requests": len(REQUEST_LOG),
        "by_endpoint":    dict(counts.most_common()),
        "uptime_seconds": int((datetime.now() - APP_START).total_seconds()),
        "api_version":    API_VERSION,
    })


@app.route("/api/symptoms")
@require_models
def list_symptoms():
    track("/api/symptoms")
    syms = sorted(models["symptom_mlb"].classes_.tolist())
    return jsonify({"total": len(syms), "symptoms": syms})


@app.route("/api/diseases")
@require_models
def list_diseases():
    diseases = sorted(models["disease_le"].classes_.tolist())
    enriched = [{"disease": d, "risk_level": DISEASE_RISK.get(d,"Unknown"),
                 "has_medication_plan": d in MEDICATION_DB} for d in diseases]
    return jsonify({"total": len(enriched), "diseases": enriched})


@app.route("/api/specialists")
@require_models
def list_specialists():
    specs = sorted(models["specialist_le"].classes_.tolist())
    return jsonify({"total": len(specs), "specialists": specs})


@app.route("/api/doctors")
@require_models
def list_doctors():
    spec_filter = request.args.get("specialist","").strip().lower()
    sort_by     = request.args.get("sort","rating")   # rating | patients | speed
    profiles    = models["doctor_profiles"]
    result = []
    for doc, info in profiles.items():
        if spec_filter and info["specialist"].lower() != spec_filter:
            continue
        result.append({
            "name":                info["name"],
            "specialist":          info["specialist"],
            "hospital":            info.get("hospital","City General Hospital"),
            "avg_rating":          info["avg_rating"],
            "total_appointments":  info["total_appointments"],
            "completion_rate":     info.get("completion_rate", 0),
            "performance_score":   info.get("performance_score", 0),
            "avg_booking_time_min":info["avg_booking_minutes"],
            "consultation_fee_inr":info.get("consultation_fee", 800),
            "available_online":    info.get("available_online", False),
            "experience_years":    info.get("experience_years", 5),
            "diseases_treated":    info["diseases_treated"][:6],
        })
    key_map = {"rating":"avg_rating","patients":"total_appointments","speed":"avg_booking_time_min"}
    rev_map = {"rating":True,"patients":True,"speed":False}
    sk = key_map.get(sort_by,"avg_rating")
    result.sort(key=lambda x: x[sk], reverse=rev_map.get(sort_by, True))
    return jsonify({"total": len(result), "doctors": result})


@app.route("/api/medication/<disease>")
def medication_info(disease):
    info = MEDICATION_DB.get(disease)
    if not info:
        return jsonify({"error":f"Disease '{disease}' not found.","available":list(MEDICATION_DB.keys())}), 404
    return jsonify({"disease": disease, "risk_level": DISEASE_RISK.get(disease,"Unknown"), **info})


@app.route("/api/slots/<path:doctor_name>")
@require_models
def appointment_slots(doctor_name):
    profiles = models["doctor_profiles"]
    if doctor_name not in profiles:
        return jsonify({"error":f"Doctor '{doctor_name}' not found."}), 404
    info  = profiles[doctor_name]
    slots = generate_slots(count=int(request.args.get("count", 6)))
    return jsonify({
        "doctor":     doctor_name,
        "specialist": info["specialist"],
        "hospital":   info.get("hospital","City General Hospital"),
        "avg_rating": info["avg_rating"],
        "available_slots": slots
    })


@app.route("/api/predict", methods=["POST"])
@require_models
def predict_disease():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error":"Request body must be JSON."}), 400

    symptoms    = data.get("symptoms", [])
    age         = max(0, min(120, int(data.get("age", 30))))
    gender      = data.get("gender","Male")
    blood_group = data.get("blood_group","O+")

    if not symptoms or not isinstance(symptoms, list):
        return jsonify({"error":"'symptoms' must be a non-empty list."}), 400

    known       = set(models["symptom_mlb"].classes_)
    valid_s     = [s.strip().title() for s in symptoms if s.strip().title() in known]
    unknown_s   = [s.strip() for s in symptoms if s.strip().title() not in known]

    if not valid_s:
        return jsonify({
            "error":"None of the provided symptoms are recognised.",
            "unknown_symptoms": unknown_s,
            "hint":"GET /api/symptoms for full list"
        }), 422

    t0 = time.time()
    X  = build_feature_vector(valid_s, age, gender, blood_group, models["symptom_mlb"])
    proba    = models["disease_model"].predict_proba(X)[0]
    top5_idx = np.argsort(proba)[::-1][:5]
    le       = models["disease_le"]
    predicted = le.inverse_transform([top5_idx[0]])[0]

    return jsonify({
        "input": {"symptoms":valid_s,"age":age,"gender":gender,"blood_group":blood_group},
        "unknown_symptoms": unknown_s,
        "symptom_match_rate": f"{len(valid_s)}/{len(symptoms)} recognised",
        "predicted_disease": predicted,
        "confidence_pct":    round(float(proba[top5_idx[0]])*100, 2),
        "risk_level": DISEASE_RISK.get(predicted,"Unknown"),
        "top_5_predictions": [
            {"rank":r+1,"disease":le.inverse_transform([i])[0],
             "probability_pct":round(float(proba[i])*100,2),
             "risk_level":DISEASE_RISK.get(le.inverse_transform([i])[0],"Unknown")}
            for r,i in enumerate(top5_idx)
        ],
        "latency_ms":   round((time.time()-t0)*1000, 1),
        "predicted_at": datetime.now().isoformat(),
        "disclaimer": "AI-based prediction only. Consult a qualified doctor."
    })


@app.route("/api/recommend", methods=["POST"])
@require_models
def recommend():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error":"Request body must be JSON."}), 400

    disease     = data.get("disease","")
    symptoms    = data.get("symptoms", [])
    age         = max(0, min(120, int(data.get("age", 30))))
    gender      = data.get("gender","Male")
    blood_group = data.get("blood_group","O+")

    if not disease:
        return jsonify({"error":"'disease' field is required."}), 400

    t0 = time.time()
    known   = set(models["symptom_mlb_rec"].classes_)
    valid_s = [s.strip().title() for s in symptoms if s.strip().title() in known] or list(known)[:3]

    X = build_feature_vector(valid_s, age, gender, blood_group, models["symptom_mlb_rec"],
                             disease=disease, disease_le=models["disease_le_rec"])
    proba     = models["specialist_model"].predict_proba(X)[0]
    top3_idx  = np.argsort(proba)[::-1][:3]
    spec_le   = models["specialist_le"]
    specialist= spec_le.inverse_transform([top3_idx[0]])[0]

    profiles = models["doctor_profiles"]
    matching = sorted(
        [(n,i) for n,i in profiles.items() if i["specialist"]==specialist],
        key=lambda x: -x[1].get("performance_score",0)
    )
    top_docs = [{
        "name": i["name"], "specialist": i["specialist"],
        "hospital": i.get("hospital","City General Hospital"),
        "avg_rating": i["avg_rating"],
        "total_patients": i["total_appointments"],
        "completion_rate": i.get("completion_rate",0),
        "performance_score": i.get("performance_score",0),
        "avg_booking_time_min": i["avg_booking_minutes"],
        "consultation_fee_inr": i.get("consultation_fee",800),
        "available_online": i.get("available_online",False),
        "experience_years": i.get("experience_years",5),
        "available_slots": generate_slots(4),
        "diseases_treated": i["diseases_treated"][:5],
    } for _,i in matching[:3]]

    med = MEDICATION_DB.get(disease,{"medications":["Consult your specialist"],
          "dosage":"As prescribed","precautions":"Follow doctor advice",
          "duration":"As advised","emergency_signs":[]})

    return jsonify({
        "disease": disease,
        "recommended_specialist": specialist,
        "specialist_confidence_pct": round(float(proba[top3_idx[0]])*100,2),
        "alternative_specialists": [
            {"specialist":spec_le.inverse_transform([i])[0],"probability_pct":round(float(proba[i])*100,2)}
            for i in top3_idx[1:]
        ],
        "top_doctors": top_docs,
        "medication_plan": {
            "medications": med["medications"],
            "dosage_instructions": med["dosage"],
            "precautions": med["precautions"],
            "treatment_duration": med["duration"],
            "emergency_warning_signs": med.get("emergency_signs",[]),
        },
        "latency_ms": round((time.time()-t0)*1000,1),
        "disclaimer": "AI recommendation only. Always consult a qualified doctor."
    })


@app.route("/api/full-diagnosis", methods=["POST"])
@require_models
def full_diagnosis():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error":"Request body must be JSON."}), 400

    symptoms    = data.get("symptoms",[])
    age         = max(0, min(120, int(data.get("age",30))))
    gender      = data.get("gender","Male")
    blood_group = data.get("blood_group","O+")

    if not symptoms or not isinstance(symptoms,list):
        return jsonify({"error":"'symptoms' must be a non-empty list."}), 400

    t0 = time.time()

    # Step 1: Predict disease
    known_d  = set(models["symptom_mlb"].classes_)
    valid_d  = [s.strip().title() for s in symptoms if s.strip().title() in known_d]
    unknown  = [s.strip() for s in symptoms if s.strip().title() not in known_d]
    if not valid_d:
        return jsonify({"error":"No recognised symptoms.","unknown_symptoms":unknown,"hint":"GET /api/symptoms"}), 422

    X_d      = build_feature_vector(valid_d, age, gender, blood_group, models["symptom_mlb"])
    proba_d  = models["disease_model"].predict_proba(X_d)[0]
    top5_d   = np.argsort(proba_d)[::-1][:5]
    le_d     = models["disease_le"]
    disease  = le_d.inverse_transform([top5_d[0]])[0]
    dis_conf = round(float(proba_d[top5_d[0]])*100,2)

    # Step 2: Recommend specialist
    known_r  = set(models["symptom_mlb_rec"].classes_)
    valid_r  = [s.strip().title() for s in symptoms if s.strip().title() in known_r] or list(known_r)[:3]
    X_r      = build_feature_vector(valid_r, age, gender, blood_group, models["symptom_mlb_rec"],
                                    disease=disease, disease_le=models["disease_le_rec"])
    proba_s  = models["specialist_model"].predict_proba(X_r)[0]
    top3_s   = np.argsort(proba_s)[::-1][:3]
    spec_le  = models["specialist_le"]
    specialist = spec_le.inverse_transform([top3_s[0]])[0]
    spec_conf  = round(float(proba_s[top3_s[0]])*100,2)

    # Step 3: Top doctors
    profiles = models["doctor_profiles"]
    matching = sorted(
        [(n,i) for n,i in profiles.items() if i["specialist"]==specialist],
        key=lambda x: -x[1].get("performance_score",0)
    )
    top_docs = [{
        "name": i["name"], "specialist": i["specialist"],
        "hospital": i.get("hospital","City General Hospital"),
        "avg_rating": i["avg_rating"],
        "total_patients": i["total_appointments"],
        "completion_rate": i.get("completion_rate",0),
        "performance_score": i.get("performance_score",0),
        "consultation_fee_inr": i.get("consultation_fee",800),
        "available_online": i.get("available_online",False),
        "experience_years": i.get("experience_years",5),
        "avg_booking_time_min": i["avg_booking_minutes"],
        "available_slots": generate_slots(4),
        "diseases_treated": i["diseases_treated"][:5],
    } for _,i in matching[:3]]

    # Step 4: Medications
    med = MEDICATION_DB.get(disease,{"medications":["Consult specialist"],
          "dosage":"As prescribed","precautions":"Follow doctor advice","duration":"As advised","emergency_signs":[]})

    return jsonify({
        "patient_info":   {"age":age,"gender":gender,"blood_group":blood_group},
        "symptoms_valid": valid_d, "symptoms_unknown": unknown,
        "disease_prediction": {
            "predicted_disease": disease,
            "confidence_pct":    dis_conf,
            "risk_level": DISEASE_RISK.get(disease,"Unknown"),
            "top_5": [{"rank":r+1,"disease":le_d.inverse_transform([i])[0],
                        "probability_pct":round(float(proba_d[i])*100,2),
                        "risk_level":DISEASE_RISK.get(le_d.inverse_transform([i])[0],"Unknown")}
                       for r,i in enumerate(top5_d)],
        },
        "specialist_recommendation": {
            "specialist": specialist, "confidence_pct": spec_conf,
            "alternatives": [
                {"specialist":spec_le.inverse_transform([i])[0],"probability_pct":round(float(proba_s[i])*100,2)}
                for i in top3_s[1:]
            ],
        },
        "top_doctors": top_docs,
        "medication_plan": {
            "medications":         med["medications"],
            "dosage_instructions": med["dosage"],
            "precautions":         med["precautions"],
            "treatment_duration":  med["duration"],
            "emergency_warning_signs": med.get("emergency_signs",[]),
        },
        "latency_ms":  round((time.time()-t0)*1000,1),
        "diagnosed_at": datetime.now().isoformat(),
        "disclaimer":  "⚠️ AI-generated for informational purposes only. Always consult a qualified healthcare professional."
    })


# ─────────────────────────────────────────────────────────────────
#  ERROR HANDLERS
# ─────────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error":"Endpoint not found.","docs":"Visit / for API documentation"}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error":"Method not allowed."}), 405

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Internal error: {e}")
    return jsonify({"error":"Internal server error.","details":str(e)}), 500


# ─────────────────────────────────────────────────────────────────
#  ENTRY POINT
# ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    border = "═" * 60
    print(f"\n╔{border}╗")
    print(f"║{'  MEDIPREDICT  —  FLASK REST API  v2.0':^60}║")
    print(f"╚{border}╝")
    if not MODELS_LOADED:
        print("\n  ⚠️  Models not found! Please run:")
        print("       python model/disease_predictor.py")
        print("       python model/doctor-recommender.py")
        print("  Then restart app.py.\n")
    else:
        print(f"\n  ✅ All {len(models)} model artifacts loaded")
        print(f"  🌐 API Dashboard : http://localhost:5001")
        print(f"  📡 Health Check  : http://localhost:5001/api/health\n")
    print(f"  {border}\n")
    app.run(debug=True, host="0.0.0.0", port=5001)