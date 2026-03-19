const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/doctor-recommender');
        console.log('✅ MongoDB Connected...');
    } catch (err) {
        console.error('⚠️  MongoDB Connection Error:', err.message);
        console.log('⚠️  Server will continue without database. Some features may not work.');
        // Don't exit - allow server to run without DB for development
    }
};

module.exports = connectDB;
