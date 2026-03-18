const express = require('express');
const router = express.Router();
const axios = require('axios');

// Using the Flask ML server URL from env or default to port 5001
const ML_SERVER_URL = process.env.ML_API_URL || 'http://127.0.0.1:5001';

// @route   POST api/prediction/predict-disease
// @desc    Predict disease based on symptoms
// @access  Private (should be authenticated)
router.post('/predict-disease', async (req, res) => {
    try {
        const { symptoms } = req.body;

        if (!symptoms || !Array.isArray(symptoms)) {
            return res.status(400).json({ error: 'Symptoms list is required' });
        }

        // Forward request to Flask server - using full-diagnosis for richer data
        const response = await axios.post(`${ML_SERVER_URL}/api/full-diagnosis`, {
            symptoms,
            age: req.body.age || 30,
            gender: req.body.gender || 'Male',
            blood_group: req.body.blood_group || 'O+'
        });

        const predictionData = response.data;

        // Map Flask response to what frontend expects
        // Flask returns: { disease_prediction: { predicted_disease, confidence_% }, specialist_recommendation: { recommended_specialist }, ... }
        const formattedResult = {
            name: predictionData.disease_prediction.predicted_disease,
            accuracy: Math.round(predictionData.disease_prediction['confidence_%']),
            specialist: predictionData.specialist_recommendation.recommended_specialist,
            description: `Analysis suggests a high probability of ${predictionData.disease_prediction.predicted_disease}.`,
            recommendations: predictionData.medication_plan.medications || [],
            precautions: predictionData.medication_plan.precautions,
            top_doctors: predictionData.top_doctors || [],
            // preserve raw data if needed
            raw: predictionData
        };

        // Save to DB if user is authenticated
        if (req.user) {
            try {
                const Prediction = require('../models/Prediction');
                const newPrediction = new Prediction({
                    user: req.user.id,
                    symptoms: symptoms,
                    disease: formattedResult.name,
                    confidence: formattedResult.accuracy,
                    specialist: formattedResult.specialist
                });
                await newPrediction.save();
            } catch (dbError) {
                console.error("Error saving prediction to DB:", dbError);
            }
        }

        res.json(formattedResult);

    } catch (error) {
        console.error('Error contacting ML Service:', error.message);

        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: 'ML Service Unavailable',
                details: 'The disease prediction service is currently offline. Please try again later.'
            });
        }

        res.status(500).json({ error: 'Prediction failed', message: error.message });
    }
});

module.exports = router;
