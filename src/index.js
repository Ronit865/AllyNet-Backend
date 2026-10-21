import dotenv from "dotenv";
import http from "http";
import connectDB from "./db/server.js";
import app from "./app.js";
import { initializeSocketIO, getSocketStats } from "./socket/socket.js";
import { createRedisClient, closeRedisConnection } from "./config/redis.config.js";
import logger from "./config/winston.config.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({
  path: path.join(__dirname, "../.env"),
  debug: false
});

const PORT = process.env.PORT || 5000;

/**
 * Initialize server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');
    
    // Initialize Redis (optional - will fallback to in-memory if not available)
    if (process.env.REDIS_DISABLED !== 'true') {
      try {
        createRedisClient();
        logger.info('Redis client initialized');
      } catch (error) {
        logger.warn('Redis initialization failed, continuing without Redis:', {
          error: error.message
        });
      }
    } else {
      logger.info('Redis disabled by configuration');
    }
    
    // Create HTTP server
    const httpServer = http.createServer(app);
    
    // Initialize Socket.io
    await initializeSocketIO(httpServer);
    logger.info('Socket.io initialized successfully');
    
    // Start listening
    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📡 Socket.io enabled for real-time features`);
      
      // Log socket stats after a short delay
      setTimeout(() => {
        const stats = getSocketStats();
        logger.info('Socket.io stats:', stats);
      }, 1000);
    });
    
    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      httpServer.close(async () => {
        logger.info('HTTP server closed');
        
        // Close Redis connection
        await closeRedisConnection();
        logger.info('Redis connection closed');
        
        // Close MongoDB connection
        await connectDB.connection.close();
        logger.info('MongoDB connection closed');
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
      });
      process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', {
        reason,
        promise
      });
      process.exit(1);
    });
    
  } catch (error) {
    logger.error("Failed to start server:", {
      error: error.message,
      stack: error.stack
    });
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();


  