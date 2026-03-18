/**
 * Database Setup Script
 * Run this once to create the MySQL/PostgreSQL database and sync all Sequelize models.
 *
 * Usage:
 *   node server/scripts/setupDatabase.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize, connectSqlDB } = require('../config/sqlDb');
// Import models to register them with Sequelize before sync
require('../models/sql');

const setup = async () => {
  console.log('\n🔧 Starting database setup...\n');

  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Force sync will drop and recreate tables — use { alter: true } to preserve data
    await sequelize.sync({ alter: true });
    console.log('✅ All tables created/updated successfully.');
    console.log('\n📋 Tables created:');
    console.log('  - health_records     (uploaded files, vitals, AI results per patient)');
    console.log('  - vitals_history     (time-series vitals for analytics graphs)');
    console.log('  - disease_analytics  (AI-predicted conditions from prescriptions)');
    console.log('\n🎉 Setup complete! Your patient dashboard database is ready.\n');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n📖 Troubleshooting tips:');
    console.log('  1. Make sure MySQL/PostgreSQL server is running');
    console.log('  2. Create the database manually: CREATE DATABASE doctor_recommender;');
    console.log('  3. Check DB_USER, DB_PASSWORD, DB_HOST in server/.env');
    console.log('  4. For MySQL: default user is "root" with empty password (MySQL 8+)');
    console.log('  5. For PostgreSQL: set DB_DIALECT=postgres and DB_USER=postgres\n');
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

setup();
