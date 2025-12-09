const { Sequelize } = require('sequelize');

// Database configuration with performance optimizations
const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'mother_india',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgresql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // Connection pool configuration for better performance
  pool: {
    max: 20,              // Maximum number of connections
    min: 5,               // Minimum number of connections (changed from 0)
    acquire: 60000,       // Maximum time (ms) to acquire connection
    idle: 10000,          // Maximum time (ms) connection can be idle
    evict: 1000,          // Time interval (ms) to check for idle connections
    maxUses: 1000         // Maximum number of times a connection can be used
  },
  
  // Query optimization settings
  dialectOptions: {
    statement_timeout: 30000,           // 30 second query timeout
    idle_in_transaction_session_timeout: 60000,  // 60 second idle transaction timeout
    application_name: 'mother_india_stock_mgmt'
  },
  
  // Model defaults
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  
  // Performance settings
  benchmark: process.env.NODE_ENV === 'development',  // Log query execution time
  logQueryParameters: process.env.NODE_ENV === 'development',
  
  // Retry configuration
  retry: {
    max: 3,
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/
    ]
  }
});

module.exports = { sequelize };