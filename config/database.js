const { Pool } = require('pg');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use DATABASE_URL if provided (Render/Heroku style), otherwise use individual vars
const databaseUrl = process.env.DATABASE_URL;

// Configuration for raw SQL queries
const pool = databaseUrl 
  ? new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'skynest',
      password: process.env.DB_PASSWORD || 'thashira123',
      port: parseInt(process.env.DB_PORT || '5432'),
      ssl: process.env.DB_SSL === 'true' ? {
          rejectUnauthorized: false
      } : undefined
    });

// Configuration for Sequelize ORM
const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    })
  : new Sequelize(
      process.env.DB_NAME || 'skynest',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || '',
      {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'postgres',
        port: parseInt(process.env.DB_PORT || '5432'),
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        },
        dialectOptions: {
          ssl: process.env.DB_SSL === 'true' ? {
              require: true,
              rejectUnauthorized: false
          } : false
        }
      }
    );

// Test database connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log(`
📊 Database Connection Details:
   Host: ${process.env.DB_HOST}
   Port: ${process.env.DB_PORT}
   Database: ${process.env.DB_NAME}
   User: ${process.env.DB_USER}
   SSL: ${process.env.DB_SSL}
        `);
        const result = await client.query('SELECT version()');
        console.log('PostgreSQL Version:', result.rows[0].version);
        client.release();
        return true;
    } catch (error) {
        console.error('Unable to connect to PostgreSQL database:', error);
        throw error;
    }
};

// Execute Query Helper
const executeQuery = async (text, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
};

// Transaction Helper
const executeTransaction = async (queries) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const results = [];
        
        for (const query of queries) {
            const result = await client.query(query.text, query.params);
            results.push(result);
        }
        
        await client.query('COMMIT');
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    sequelize,
    executeQuery,
    executeTransaction,
    testConnection
};