const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctor: {
        type: String, // Can be refined to ref 'Doctor' if we had a full doctor registration
        required: true
    },
    specialist: {
        type: String,
        required: true
    },
    date: {
        type: String, // Preferred format: YYYY-MM-DD
        required: true
    },
    time: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: 'General Consultation'
    },
    symptoms: [String],
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
