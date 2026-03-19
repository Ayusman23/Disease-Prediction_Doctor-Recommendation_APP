// server/services/mlService.js
const axios = require('axios');

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

class MLService {
  /**
   * Predict disease from symptoms
   * @param {Array<string>} symptoms - List of symptoms
   * @returns {Promise<Object>} Prediction results
   */
  async predictDisease(symptoms) {
    try {
      const response = await axios.post(`${ML_API_URL}/api/predict`, {
        symptoms
      }, {
        timeout: 10000
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('ML Prediction Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.error || 'ML service unavailable'
      };
    }
  }

  /**
   * Get all available symptoms
   * @returns {Promise<Object>} List of symptoms
   */
  async getSymptoms() {
    try {
      const response = await axios.get(`${ML_API_URL}/api/symptoms`, {
        timeout: 5000
      });

      return {
        success: true,
        symptoms: response.data.symptoms
      };
    } catch (error) {
      console.error('Get Symptoms Error:', error.message);
      return {
        success: false,
        error: 'Could not fetch symptoms'
      };
    }
  }

  /**
   * Get specialist recommendation for a disease
   * @param {string} disease - Disease name
   * @returns {Promise<Object>} Specialist recommendation
   */
  async recommendDoctor(disease) {
    try {
      const response = await axios.post(`${ML_API_URL}/api/recommend-doctor`, {
        disease
      }, {
        timeout: 5000
      });

      return {
        success: true,
        specialist: response.data.recommended_specialist
      };
    } catch (error) {
      console.error('Doctor Recommendation Error:', error.message);
      return {
        success: false,
        error: 'Could not get recommendation'
      };
    }
  }

  /**
   * Check ML service health
   * @returns {Promise<boolean>} Service status
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${ML_API_URL}/health`, {
        timeout: 3000
      });
      return response.data.model_loaded;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new MLService();