import Redis from 'ioredis';
import logger from './winston.config.js';

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  
  // Retry strategy
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis reconnection attempt ${times}, delay: ${delay}ms`);
    return delay;
  },
  
  // Timeouts
  connectTimeout: 10000,
  maxRetriesPerRequest: 3,
  
  // Keep alive
  keepAlive: 30000,
  
  // Connection name for debugging
  connectionName: 'allynet-backend',
  
  // Enable offline queue
  enableOfflineQueue: true,
  
  // Reconnect on error
  reconnectOnError: (err) => {
    logger.error('Redis connection error:', { error: err.message });
    return true;
  }
};

/**
 * Create Redis client instance
 * Singleton pattern to ensure only one connection
 */
let redisClient = null;

export const createRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }
  
  // Check if Redis is disabled
  if (process.env.REDIS_DISABLED === 'true') {
    logger.info('Redis is disabled. Using in-memory store.');
    return null;
  }
  
  try {
    redisClient = new Redis(REDIS_CONFIG);
    
    // Event handlers
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', { error: err.message });
    });
    
    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });
    
    return redisClient;
  } catch (error) {
    logger.error('Failed to create Redis client:', { error: error.message });
    return null;
  }
};

/**
 * Get existing Redis client
 */
export const getRedisClient = () => {
  if (!redisClient) {
    return createRedisClient();
  }
  return redisClient;
};

/**
 * Close Redis connection
 */
export const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis connection closed');
  }
};

/**
 * Redis key prefixes for different data types
 */
export const REDIS_KEYS = {
  // Socket.io related
  SOCKET_USER_MAP: 'socket:user:',
  USER_SOCKET_MAP: 'user:socket:',
  USER_PRESENCE: 'presence:',
  TYPING_INDICATOR: 'typing:',
  
  // Rate limiting
  RATE_LIMIT: 'ratelimit:',
  
  // Session and auth
  SESSION: 'session:',
  TOKEN_BLACKLIST: 'blacklist:token:',
  
  // Cache
  CACHE: 'cache:',
  USER_CACHE: 'cache:user:',
  POST_CACHE: 'cache:post:',
  
  // Temporary data
  TEMP: 'temp:',
  OTP: 'otp:'
};

/**
 * Helper function to build Redis keys
 */
export const buildKey = (prefix, identifier) => {
  return `${prefix}${identifier}`;
};

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  DAY: 86400 // 24 hours
};

/**
 * Set data in Redis with optional TTL
 */
export const setCache = async (key, value, ttl = CACHE_TTL.MEDIUM) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await client.setex(key, ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
    return true;
  } catch (error) {
    logger.error('Redis setCache error:', { error: error.message, key });
    return false;
  }
};

/**
 * Get data from Redis
 */
export const getCache = async (key) => {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Redis getCache error:', { error: error.message, key });
    return null;
  }
};

/**
 * Delete data from Redis
 */
export const deleteCache = async (key) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.error('Redis deleteCache error:', { error: error.message, key });
    return false;
  }
};

/**
 * Delete multiple keys matching a pattern
 */
export const deleteCachePattern = async (pattern) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    return true;
  } catch (error) {
    logger.error('Redis deleteCachePattern error:', { error: error.message, pattern });
    return false;
  }
};

/**
 * Increment a counter in Redis
 */
export const incrementCounter = async (key, ttl = null) => {
  const client = getRedisClient();
  if (!client) return 1;
  
  try {
    const value = await client.incr(key);
    if (ttl && value === 1) {
      await client.expire(key, ttl);
    }
    return value;
  } catch (error) {
    logger.error('Redis incrementCounter error:', { error: error.message, key });
    return 1;
  }
};

/**
 * Add item to a set in Redis
 */
export const addToSet = async (key, value) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.sadd(key, value);
    return true;
  } catch (error) {
    logger.error('Redis addToSet error:', { error: error.message, key });
    return false;
  }
};

/**
 * Remove item from a set in Redis
 */
export const removeFromSet = async (key, value) => {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    await client.srem(key, value);
    return true;
  } catch (error) {
    logger.error('Redis removeFromSet error:', { error: error.message, key });
    return false;
  }
};

/**
 * Get all members of a set in Redis
 */
export const getSetMembers = async (key) => {
  const client = getRedisClient();
  if (!client) return [];
  
  try {
    return await client.smembers(key);
  } catch (error) {
    logger.error('Redis getSetMembers error:', { error: error.message, key });
    return [];
  }
};

export default {
  createRedisClient,
  getRedisClient,
  closeRedisConnection,
  REDIS_KEYS,
  CACHE_TTL,
  buildKey,
  setCache,
  getCache,
  deleteCache,
  deleteCachePattern,
  incrementCounter,
  addToSet,
  removeFromSet,
  getSetMembers
};
