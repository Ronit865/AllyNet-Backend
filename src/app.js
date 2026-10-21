import express from 'express';
import cors from 'cors';   
import cookieParser from 'cookie-parser';
import securityMiddleware from './middlewares/security.middleware.js';
import { httpLogger, requestId } from './middlewares/logger.middleware.js';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

// Request ID for tracing
app.use(requestId);

// HTTP Request Logging
app.use(httpLogger);

// Security middleware (Helmet, XSS protection, NoSQL injection prevention)
app.use(securityMiddleware);

// CORS Configuration
const allowedOrigins = [
  'https://allynet-app.vercel.app',
  'http://localhost:5173',
  'https://allynet.lovable.app',
  ...(process.env.CORS_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie', 'Cookie', 'X-Requested-With'],
}));

// Body parsers with reduced limits (more secure)
app.use(express.json({limit:"10mb"}));  // Reduced from 50mb
app.use(express.urlencoded({extended:true, limit:"10mb"}));  // Reduced from 50mb
app.use(express.static('public'))  // Static files
app.use(cookieParser())  // Cookie parsing

// General rate limiting (apply to all routes)
app.use('/api/', generalLimiter);

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Routes
import userRouter from './routes/user.routes.js';
import adminRouter from './routes/admin.routes.js';
import eventRouter from './routes/events.routes.js';
import loginRouter from './routes/login.routes.js';
import donationRouter from './routes/donation.routes.js';
import jobRouter from './routes/jobs.routes.js';
import emailRouter from './routes/email.routes.js';
import postRouter from './routes/post.routes.js';
import notificationRouter from './routes/notification.routes.js';
import connectionRouter from './routes/connection.routes.js';
import messageRouter from './routes/message.routes.js';

app.use('/api/',loginRouter)
app.use('/api/admin',adminRouter)
app.use('/api/users',userRouter)
app.use('/api/events',eventRouter)
app.use('/api/jobs', jobRouter);
app.use('/api/donations',donationRouter)
app.use('/api/emails', emailRouter);
app.use('/api/communications', postRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/connections', connectionRouter);
app.use('/api/messages', messageRouter);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;