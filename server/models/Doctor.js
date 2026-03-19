const mongoose = require('mongoose');

const DoctorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    specialty: {
        type: String,
        required: true
    },
    qualification: {
        type: String,
        required: true
    },
    experience: {
        type: Number,
        required: true
    },
    hospital: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        default: 0
    },
    location: {
        type: String,
        required: true
    },
    contact: {
        type: String
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Doctor', DoctorSchema);
