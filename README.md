# Doctor Recommender App - Full Stack Application

A full-stack AI-powered disease prediction and doctor recommendation system built with React, Node.js, Flask, and MongoDB.

## 🏗️ Architecture

```
┌─────────────────┐
│  React Client   │  Port 5174 (Vite Dev Server)
│   (Frontend)    │
└────────┬────────┘
         │ /api/* requests proxied to backend
         ▼
┌─────────────────┐
│  Node.js/Express│  Port 5000
│    (Backend)    │
└────────┬────────┘
         │ Forwards /api/prediction/* to ML service
         ▼
┌─────────────────┐
│  Flask ML API   │  Port 5001
│ (Python/sklearn)│
└─────────────────┘
```

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (optional - app will run without it in dev mode)
- **npm** or **yarn**

## 🚀 Quick Start

### 1. Install Dependencies

From the root directory:

```bash
npm install
cd client && npm install
cd ../server && npm install
cd ..
```

### 2. Install Python Dependencies

Activate your virtual environment (if using one):

```bash
# Windows
.venv\Scripts\Activate.ps1

# Linux/Mac
source .venv/bin/activate
```

Install Python packages:

```bash
pip install flask flask-cors scikit-learn pandas joblib numpy
```

### 3. Generate Dataset and Train Model

```bash
# From root directory
python server/ml_model/data/generate_dataset.py
python server/ml_model/model/disease_predictor.py --train
```

### 4. Run the Application

**Single Command (Recommended):**

```bash
npm start
```

This will start:
- ✅ React frontend (http://localhost:5174)
- ✅ Node.js backend (http://localhost:5000)
- ✅ Flask ML service (http://127.0.0.1:5001)

**Or run individually:**

```bash
# Terminal 1 - Frontend
npm run client

# Terminal 2 - Backend + ML Service
npm run server
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/doctor-recommender
JWT_SECRET=your_secret_key_here
```

### MongoDB (Optional)

If MongoDB is not installed, the app will still run but without database persistence. To install MongoDB:

- **Windows**: Download from [mongodb.com](https://www.mongodb.com/try/download/community)
- **Linux**: `sudo apt-get install mongodb`
- **Mac**: `brew install mongodb-community`

## 📁 Project Structure

```
doctor-recommender-app/
├── client/                    # React frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── UserDashboard.jsx
│   │   │   └── DoctorDashboard.jsx
│   │   └── App.jsx
│   └── vite.config.js        # Proxy configuration
├── server/                    # Node.js backend
│   ├── config/
│   │   └── db.js             # MongoDB connection
│   ├── models/
│   │   ├── User.js
│   │   ├── Doctor.js
│   │   └── Prediction.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── doctorRoutes.js
│   │   └── predictionRoutes.js
│   ├── ml_model/
│   │   ├── data/
│   │   │   ├── generate_dataset.py
│   │   │   └── disease_dataset.csv
│   │   ├── model/
│   │   │   ├── disease_predictor.py
│   │   │   ├── disease_model.pkl
│   │   │   └── model_columns.pkl
│   │   └── app.py            # Flask ML API
│   └── index.js              # Express server
└── package.json              # Root scripts

```

## 🧪 Testing the ML Model

Test the disease predictor directly:

```bash
python server/ml_model/model/disease_predictor.py fever cough headache
```

Expected output:
```json
{
  "prediction": "Flu",
  "confidence": 0.85,
  "top_predictions": [...],
  "matched_symptoms": ["fever", "cough", "headache"]
}
```

## 🎯 Features

- **AI Disease Prediction**: 15 diseases with 1500+ training samples
- **Smart Symptom Matching**: Intelligent symptom normalization
- **Doctor Recommendations**: Specialist suggestions based on predictions
- **User Dashboard**: Track predictions, appointments, and health records
- **Real-time Analysis**: Instant disease prediction with confidence scores

## 🐛 Troubleshooting

### Port Already in Use

If you see "Port 5173 is in use", the app will automatically try the next available port (5174, 5175, etc.)

### Python Module Not Found

Make sure your virtual environment is activated and all dependencies are installed:

```bash
pip install -r server/ml_model/requirements.txt
```

### MongoDB Connection Error

The app will continue to run without MongoDB. To fix:
1. Install MongoDB
2. Start MongoDB service: `mongod` or `brew services start mongodb-community`
3. Restart the application

### Model Version Mismatch

If you see sklearn version warnings, retrain the model:

```bash
del server\ml_model\model\*.pkl
python server/ml_model/model/disease_predictor.py --train
```

## 📊 Dataset

The application uses a synthetic dataset with:
- **15 diseases**: Flu, Malaria, COVID-19, Diabetes, Migraine, etc.
- **60+ symptoms**: fever, cough, headache, nausea, etc.
- **1500+ samples**: 100 samples per disease

## 🔐 API Endpoints

### Backend (Node.js - Port 5000)

- `POST /api/auth/register` - Register new user
- `GET /api/doctors` - Get all doctors
- `POST /api/prediction/predict-disease` - Predict disease from symptoms

### ML Service (Flask - Port 5001)

- `POST /predict` - Raw ML prediction endpoint

## 🛠️ Development

### Rebuild Model

```bash
python server/ml_model/model/disease_predictor.py --train
```

### View Model Info

```bash
python server/ml_model/inspect_model.py
```

## 📝 License

MIT

## 👥 Support

For issues or questions, please check the troubleshooting section above.
