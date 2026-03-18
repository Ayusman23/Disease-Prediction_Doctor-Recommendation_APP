const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const jwt = require('jsonwebtoken');

// Middleware to authenticate user
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) throw new Error();
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'doctor_recommender_secret_key_2024');
        req.userId = decoded.id || decoded._id;
        next();
    } catch (e) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

// @route   POST api/appointments/book
// @desc    Book a new appointment
router.post('/book', auth, async (req, res) => {
    try {
        const { specialist, reason, symptoms, date, time, doctorName } = req.body;

        const appointment = new Appointment({
            user: req.userId,
            doctor: doctorName || 'Dr. Not Assigned',
            specialist,
            date: date || new Date().toISOString().split('T')[0],
            time: time || '10:00 AM',
            reason,
            symptoms,
            status: 'pending'
        });

        await appointment.save();
        res.status(201).json(appointment);
    } catch (error) {
        console.error('Error booking appointment:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/appointments/my-appointments
// @desc    Get appointments for the logged-in user
router.get('/my-appointments', auth, async (req, res) => {
    try {
        const appointments = await Appointment.find({ user: req.userId }).sort({ createdAt: -1 });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET api/appointments/all
// @desc    Get all appointments (for doctor dashboard)
router.get('/all', async (req, res) => {
    try {
        const appointments = await Appointment.find().populate('user', 'name email').sort({ createdAt: -1 });
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PATCH api/appointments/:id/status
// @desc    Update appointment status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
