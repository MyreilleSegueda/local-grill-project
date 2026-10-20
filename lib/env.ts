/**
 * Environment variables configuration
 * Centralized and validated env access
 */

const requiredEnvVars = [
  'MYSQL_HOST',
  'MYSQL_USER',
  'MYSQL_DATABASE',
  'JWT_SECRET',
  'JWT_EXPIRY',
] as const;

type EnvVar = typeof requiredEnvVars[number];

/**
 * Validates that all required environment variables are set
 */
export function validateEnv() {
  const missing = requiredEnvVars.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Get environment variable with type safety
 */
export function getEnv(key: EnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get optional environment variable
 */
export function getOptionalEnv(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || '';
}

/**
 * Environment configuration object
 */
export const env = {
  // Database
  db: {
    host: getEnv('MYSQL_HOST'),
    user: getEnv('MYSQL_USER'),
    password: getOptionalEnv('MYSQL_PASSWORD', ''),
    database: getEnv('MYSQL_DATABASE'),
    port: parseInt(getOptionalEnv('MYSQL_PORT', '3306')),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  },

  // JWT
  jwt: {
    secret: getEnv('JWT_SECRET'),
    expiresIn: getEnv('JWT_EXPIRY') || '24h',
  },

  // App
  app: {
    name: 'Restaurant Stock Management',
    version: '1.0.0',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // URL
  url: {
    api: getOptionalEnv('API_URL', 'https://gestion.localgrill-bf.com/api'),
  },
} as const;

// Validate on import
if (typeof window === 'undefined') {
  validateEnv();
}
