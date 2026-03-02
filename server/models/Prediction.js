const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    symptoms: [{
        type: String,
        required: true
    }],
    disease: {
        type: String,
        required: true
    },
    confidence: {
        type: Number,
        required: true
    },
    specialist: {
        type: String,
        required: true
    },
    recommendedDoctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Prediction', PredictionSchema);
