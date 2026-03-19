# MediPredict — Full-Stack AI Healthcare Platform

A full-stack AI-powered disease prediction and doctor recommendation system built with **React**, **Node.js/Express**, **Flask (Python/ML)**, and **Firebase**.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│         React Client (Vite)              │  http://localhost:5173
│  - Patient, Doctor, Admin Dashboards     │
│  - DPDR Body-Map Disease Predictor       │
│  - Login (Patient / Doctor / Admin)      │
└──────────┬──────────────┬───────────────┘
           │ /api/*       │ /dpdr/*
           ▼              ▼
┌─────────────────┐  ┌───────────────────────┐
│ Node.js/Express │  │   Flask ML API (DPDR) │
│   Port 5000     │  │     Port 5001         │
│  - Auth Routes  │  │  - /symptoms (GET)    │
│  - Doctor Data  │  │  - /predict  (POST)   │
│  - Appointments │  │  - scikit-learn model │
└────────┬────────┘  └───────────────────────┘
         │
         ▼
┌─────────────────┐   ┌──────────────────────┐
│    MongoDB      │   │   Firebase           │
│   (optional)    │   │  - Auth (Email/Social)│
│  - Users        │   │  - Firestore DB      │
│  - Doctors      │   │  - User roles        │
│  - Predictions  │   └──────────────────────┘
└─────────────────┘
```

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd doctor-recommender-app

# Install all node dependencies
npm run install-all
```

### 2. Install Python Dependencies (DPDR Flask API)

```bash
cd server/DPDR

# Option A: Use the virtual environment (recommended)
python -m venv myenv

# Activate — Windows PowerShell
myenv\Scripts\Activate.ps1

# Activate — Linux/Mac
source myenv/bin/activate

# Install packages
pip install -r requirements.txt
```

> **Key Python packages:** `flask`, `flask-cors`, `scikit-learn`, `pandas`, `numpy`

### 3. Configure Environment Variables

Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/doctor-recommender
JWT_SECRET=your_secret_key_here
```

Create `client/.env`:
```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## ▶️ Running the Application

### Option A — Start Everything (Recommended)

```bash
npm run start-all
```

This starts **all three services** concurrently:
| Service | URL | Command |
|---------|-----|---------|
| ⚛️ React Frontend | http://localhost:5173 | `npm run client` |
| 🟢 Node.js Backend | http://localhost:5000 | `npm run server` |
| 🐍 Flask DPDR ML API | http://localhost:5001 | `npm run dpdr` |

### Option B — Start Services Individually

```bash
# Terminal 1 — React frontend
npm run client

# Terminal 2 — Node.js backend
npm run server

# Terminal 3 — Flask DPDR ML API (activate venv first)
cd server/DPDR
myenv\Scripts\Activate.ps1   # Windows
python app.py
```

---

## 🔐 User Roles & Login

The login page has **three tabs**:

| Role | Login Tab | Redirect |
|------|-----------|----------|
| 🧑 Patient | Patient | `/dashboard` |
| 👨‍⚕️ Doctor | Doctor | `/doctor-dashboard` |
| 🛡️ Admin | 🔐 Admin | `/admin-dashboard` |

- **Admin email:** `ayusmansamantaray08@gmail.com` — only this email can access the admin tab
- Social login (Google, Facebook) is available for Patient & Doctor roles only

---

## 🧬 DPDR — Disease Prediction & Diagnosis Report

The **DPDR module** replaces the old chatbot section in the Patient Dashboard.

### Features
- 🫁 **Interactive Body Map** — Click body regions (Head, Chest, Abdomen, Arms, Legs, General) to browse region-specific symptoms
- ♂️ / ♀️ **Male & Female body diagrams** — toggle between anatomically distinct SVG silhouettes
- 🔍 **Global symptom search** — fuzzy search across all 130+ symptoms from the ML training dataset
- 🤖 **ML Prediction** — connects to the Flask DPDR backend (`/dpdr/predict`) which uses the trained `model.pkl` (scikit-learn)
- ⚡ **Smart fallback** — if Flask is offline, the component uses a local rule-based AI fallback
- 📊 **Diagnosis Result panel** — shows predicted disease, severity, recommended specialist, symptom breakdown, and care recommendations

### DPDR API Endpoints (Flask — Port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/symptoms` | Returns list of all symptoms from Training.csv |
| POST | `/predict` | Predicts disease from selected symptoms |

**Predict Request Body:**
```json
{ "symptoms": ["headache", "high_fever", "nausea"] }
```

**Predict Response:**
```json
{
  "prediction": "Migraine",
  "matched_symptoms": ["headache", "nausea"],
  "total_symptoms_used": 2
}
```

---

## 📁 Project Structure

```
doctor-recommender-app/
├── client/                        # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx          # 3-tab login (Patient/Doctor/Admin)
│   │   │   ├── UserDashboard.jsx  # Patient dashboard + DPDR trigger
│   │   │   ├── DoctorDashboard.jsx
│   │   │   ├── AdminDashboard.jsx # Full admin control panel
│   │   │   └── DPDRPredictor.jsx  # ← NEW: Body map disease predictor
│   │   ├── firebase/
│   │   │   └── config.js
│   │   └── App.jsx
│   ├── vite.config.js             # Proxies /api → :5000, /dpdr → :5001
│   └── .env                       # Firebase keys
├── server/                        # Node.js/Express backend
│   ├── DPDR/                      # ← Flask ML service
│   │   ├── app.py                 # Flask API with CORS (port 5001)
│   │   ├── model.pkl              # Trained scikit-learn model
│   │   ├── Training.csv           # Disease symptom dataset
│   │   ├── requirements.txt       # Python deps (flask-cors added)
│   │   └── index.html             # Standalone HTML interface
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── doctorRoutes.js
│   │   ├── predictionRoutes.js
│   │   └── appointmentRoutes.js
│   ├── models/
│   ├── config/db.js
│   ├── index.js                   # Express server (port 5000)
│   └── .env
└── package.json                   # Root scripts (start-all, dpdr, etc.)
```

---

## 🎯 Features Overview

### 👤 Patient Dashboard
- **DPDR Body-Map Predictor** — Interactive male/female body diagram to select symptoms and get ML predictions
- AI Prescription Upload — Claude Vision AI reads handwritten prescriptions and extracts vitals
- Health Records, Vitals Tracking, Analytics
- Book Appointments with nearby doctors (Google Maps integration)
- Notifications system

### 👨‍⚕️ Doctor Dashboard
- Patient Records & Appointments management
- Prescriptions, Diagnoses, Vital Signs
- Billing & Invoices
- Task management & Reminders
- Theme customization

### 🛡️ Admin Dashboard
- Full user management (view/delete patients & doctors)
- Appointment overview across all users
- System statistics and analytics
- Guest access link generation
- System settings

---

## 🔧 API Reference

### Node.js Backend (Port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/doctors` | Get all doctors |
| GET | `/api/appointments/all` | Admin: get all appointments |
| POST | `/api/prediction/predict-disease` | Disease prediction (legacy) |

### Flask DPDR Service (Port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/symptoms` | All symptoms from training data |
| POST | `/predict` | ML disease prediction |

---

## 🐛 Troubleshooting

### DPDR Flask API not connecting
```
● Fallback Mode shown in DPDR predictor header
```
**Fix:**
1. Activate your Python venv
2. Run: `cd server/DPDR && python app.py`
3. Make sure port 5001 is free: `netstat -aon | findstr :5001`

### Flask-CORS not found
```bash
pip install flask-cors
```

### scikit-learn version mismatch warning
The `model.pkl` was trained with a specific version of scikit-learn. If you see version warnings:
```bash
pip install scikit-learn==1.8.0
```

### Firebase Auth errors
Ensure your `client/.env` has all six `VITE_FIREBASE_*` variables set correctly.

### MongoDB not running
The app continues to function without MongoDB (Firebase handles auth). To enable full DB features:
```bash
# Windows
net start MongoDB

# Mac/Linux
brew services start mongodb-community
```

---

## 📊 ML Dataset

The DPDR model uses the included `Training.csv`:
- **130+ symptoms** across all body regions
- **40+ diseases** including Migraine, Diabetes, Heart Disease, Hepatitis, etc.
- **Trained model**: Random Forest classifier (`model.pkl`)

---

## 📝 License

MIT

## 👥 Support

For issues, check the Troubleshooting section above or open a GitHub issue.
