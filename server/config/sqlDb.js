const { Sequelize } = require('sequelize');

const dialect = process.env.DB_DIALECT || 'mysql'; // can be 'postgres' or 'mysql'

const sequelize = new Sequelize(
  process.env.DB_NAME || 'doctor_recommender',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: dialect,
    logging: false,
  }
);

const connectSqlDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ ${dialect.toUpperCase()} Database connected successfully.`);
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log(`✅ SQL Models synchronized.`);
  } catch (error) {
    console.error(`⚠️ Unable to connect to the ${dialect} database:`, error.message);
    console.log('⚠️ Please ensure your MySQL/PostgreSQL server is running and the database exists.');
  }
};

module.exports = { sequelize, connectSqlDB };
