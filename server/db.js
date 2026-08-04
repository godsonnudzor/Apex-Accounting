import dotenv from 'dotenv';
dotenv.config();

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

const sql = connectionString
  ? postgres(connectionString, {
      ssl: 'require',
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  : null;

const safeQuery = async (...args) => {
  if (!sql) {
    throw new Error('DATABASE_URL is not configured');
  }

  return sql(...args);
};

export default safeQuery;