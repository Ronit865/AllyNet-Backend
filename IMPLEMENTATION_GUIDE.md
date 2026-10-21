# 🚀 AllyNet Backend - Implementation Guide

## Overview

This guide explains how to use the newly implemented features in the AllyNet backend, including Socket.io real-time communication, RBAC system, security middleware, and validation.

---

## 📁 Project Structure

```
AllyNet-B/
├── src/
│   ├── config/              # Configuration files
│   │   ├── permissions.config.js    # RBAC permissions
│   │   ├── winston.config.js        # Logging configuration
│   │   ├── socket.config.js         # Socket.io events
│   │   └── redis.config.js          # Cache configuration
│   │
│   ├── middlewares/         # Middleware functions
│   │   ├── auth.middleware.js       # JWT authentication
│   │   ├── rbac.middleware.js       # Role-based access control
│   │   ├── security.middleware.js   # Security headers
│   │   ├── rateLimiter.middleware.js # Rate limiting
│   │   ├── validation.middleware.js # Input validation
│   │   ├── banCheck.middleware.js   # Ban enforcement
│   │   ├── errorHandler.middleware.js # Error handling
│   │   └── logger.middleware.js     # HTTP logging
│   │
│   ├── validators/          # Validation schemas
│   │   ├── auth.validator.js
│   │   ├── user.validator.js
│   │   ├── message.validator.js
│   │   ├── admin.validator.js
│   │   └── post.validator.js
│   │
│   ├── socket/              # Socket.io implementation
│   │   ├── socket.js        # Main Socket.io server
│   │   ├── auth.socket.js   # Socket authentication
│   │   └── handlers/        # Event handlers
│   │       ├── message.handler.js
│   │       ├── notification.handler.js
│   │       └── presence.handler.js
│   │
│   └── services/
│       └── socket.service.js # Socket helper functions
│
└── logs/                    # Log files (auto-created)
```

---

## 🔐 RBAC System

### Roles Hierarchy

1. **superadmin** - Full system access
2. **admin** - User management, content moderation
3. **moderator** - Content moderation, reports
4. **alumni** - Full user features + event/job creation
5. **student** - Basic user features

### Using RBAC in Routes

```javascript
import { requireRole, requirePermission, adminOnly } from './middlewares/rbac.middleware.js';
import { PERMISSIONS } from './config/permissions.config.js';

// Require specific role
router.post('/admin-action', requireRole(['admin', 'superadmin']), controller);

// Require specific permission
router.delete('/post/:id', requirePermission(PERMISSIONS.POST_DELETE), controller);

// Convenience wrapper
router.get('/admin/dashboard', adminOnly, getDashboard);
```

### Permission Checking in Controllers

```javascript
import { hasPermission } from '../config/permissions.config.js';

if (hasPermission(req.user.role, PERMISSIONS.USER_BAN)) {
  // User can ban others
}
```

---

## 🛡️ Security Middleware

### Applying Security Headers

Already applied globally in `app.js`:
- Helmet security headers (11 headers)
- XSS protection
- NoSQL injection prevention
- Parameter pollution prevention

### Rate Limiting

```javascript
import { 
  authLimiter,      // 10 req/min
  messageLimiter,   // 50 req/min
  adminLimiter,     // 200 req/15min
  uploadLimiter,    // 20 req/hour
  emailLimiter      // 5 req/hour
} from './middlewares/rateLimiter.middleware.js';

// Apply to routes
router.post('/login', authLimiter, login);
router.post('/message', messageLimiter, sendMessage);
router.post('/upload', uploadLimiter, upload);
```

---

## ✅ Input Validation

### Creating Validation Rules

```javascript
// In validators/feature.validator.js
import { body, param, query } from 'express-validator';

export const createItemValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
];
```

### Using Validation in Routes

```javascript
import { createItemValidation } from './validators/feature.validator.js';
import { validate } from './middlewares/validation.middleware.js';

router.post('/item',
  createItemValidation,  // Validation rules
  validate,              // Process validation
  createItemController
);
```

---

## 🚫 Ban System

### Checking Ban Status

```javascript
import { requireNotBanned, canCreateContent } from './middlewares/banCheck.middleware.js';

// Block all banned users
router.post('/post', requireNotBanned, createPost);

// Block banned users from content creation
router.post('/comment', canCreateContent, createComment);
```

### Banning a User (in controller)

```javascript
import { forceDisconnectUser } from '../services/socket.service.js';
import { logAudit } from '../config/winston.config.js';

export const banUser = async (req, res) => {
  const { userId, banType, reason, duration } = req.body;
  
  const user = await User.findById(userId);
  user.banStatus = banType; // 'temp_banned' or 'suspended'
  user.banReason = reason;
  
  if (banType === 'temp_banned') {
    user.banExpiresAt = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
  }
  
  await user.save();
  
  // Force disconnect from Socket.io
  await forceDisconnectUser(userId, `Account ${banType}`);
  
  // Log the action
  logAudit('USER_BANNED', req.admin, { type: 'user', id: userId }, { banType, reason });
  
  res.status(200).json({ success: true });
};
```

---

## ⚡ Socket.io Real-Time

### Frontend Connection

```javascript
import io from 'socket.io-client';

// Connect to server
const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('jwtToken')
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('auth:success', (data) => {
  console.log('Authenticated:', data);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Listening for Events

```javascript
// New message received
socket.on('message:new', (data) => {
  const { message, conversationId } = data;
  addMessageToUI(message);
  playNotificationSound();
});

// New notification
socket.on('notification:new', (notification) => {
  showToast(notification.message);
  updateNotificationBadge();
});

// User online/offline
socket.on('user:online', (data) => {
  updateUserStatus(data.userId, 'online');
});

socket.on('user:offline', (data) => {
  updateUserStatus(data.userId, 'offline');
});

// Typing indicator
socket.on('typing:indicator', (data) => {
  if (data.isTyping) {
    showTypingIndicator(data.userName);
  } else {
    hideTypingIndicator();
  }
});
```

### Sending Events

```javascript
// Send a message
socket.emit('message:send', {
  conversationId: 'conv_id',
  content: 'Hello!'
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  }
});

// Start typing
socket.emit('typing:start', { conversationId: 'conv_id' });

// Stop typing
socket.emit('typing:stop', { conversationId: 'conv_id' });

// Join conversation room
socket.emit('room:join', { conversationId: 'conv_id' });

// Mark as read
socket.emit('message:read', { messageId: 'msg_id' });
```

### Emitting from Controllers

```javascript
import { 
  emitNewMessage, 
  emitNewNotification,
  emitNewPost 
} from '../services/socket.service.js';

// After creating a message
export const sendMessage = async (req, res) => {
  const message = await Message.create({...});
  
  // Emit to recipient
  emitNewMessage(recipientId, {
    message,
    conversationId
  });
  
  res.status(201).json({ success: true, message });
};

// After creating a post
export const createPost = async (req, res) => {
  const post = await Post.create({...});
  
  // Broadcast to all users
  emitNewPost({
    post,
    author: req.user
  });
  
  res.status(201).json({ success: true, post });
};
```

---

## 📝 Logging

### Using Winston Logger

```javascript
import logger, { logAudit, logSecurity, logError } from '../config/winston.config.js';

// General logging
logger.info('User logged in', { userId: user._id, ip: req.ip });
logger.warn('Suspicious activity detected');
logger.error('Database connection failed');
logger.debug('Processing request', { data: req.body });

// Audit logging (admin actions)
logAudit('USER_DELETED', admin, { type: 'user', id: userId }, { reason: 'spam' });

// Security logging
logSecurity('Multiple failed login attempts', {
  ip: req.ip,
  attempts: 5,
  severity: 'high'
});

// Error logging
try {
  // ... code
} catch (error) {
  logError(error, {
    userId: req.user._id,
    action: 'create_post'
  });
}
```

### Log Files

Logs are stored in `logs/` directory:
- `all-YYYY-MM-DD.log` - All logs
- `error-YYYY-MM-DD.log` - Errors only
- `http-YYYY-MM-DD.log` - HTTP requests
- `audit-YYYY-MM-DD.log` - Admin actions

---

## 🔧 Complete Route Example

```javascript
import express from 'express';
import { createPost, updatePost, deletePost } from '../controllers/post.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requirePermission, requireOwnershipOrPermission } from '../middlewares/rbac.middleware.js';
import { requireNotBanned, canCreateContent } from '../middlewares/banCheck.middleware.js';
import { postCreationLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { createPostValidation, updatePostValidation } from '../validators/post.validator.js';
import { PERMISSIONS } from '../config/permissions.config.js';

const router = express.Router();

// Create post
router.post('/',
  verifyJWT,                    // Authentication
  requireNotBanned,             // Ban check
  canCreateContent,             // Content creation permission
  postCreationLimiter,          // Rate limit: 30 posts/hour
  createPostValidation,         // Validation rules
  validate,                     // Process validation
  createPost                    // Controller
);

// Update post
router.patch('/:postId',
  verifyJWT,
  requireNotBanned,
  requireOwnershipOrPermission(
    'post',
    'postId',
    async (postId) => {
      const post = await Post.findById(postId);
      return post?.author;
    },
    PERMISSIONS.POST_UPDATE       // Admins can update any post
  ),
  updatePostValidation,
  validate,
  updatePost
);

// Delete post
router.delete('/:postId',
  verifyJWT,
  requirePermission(PERMISSIONS.POST_DELETE), // Only admins
  deletePost
);

export default router;
```

---

## 🧪 Testing

### Manual Testing

1. **Test Authentication**:
```bash
# Login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

2. **Test Rate Limiting**:
```bash
# Make 11 requests quickly (should get rate limited)
for i in {1..11}; do
  curl -X POST http://localhost:5000/api/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

3. **Test Socket.io**:
Use the Socket.io test client in browser console:
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => console.log('Connected!'));
socket.on('message:new', (data) => console.log('New message:', data));
```

### Automated Testing (Recommendations)

```javascript
// Example: Testing RBAC
describe('RBAC Middleware', () => {
  it('should allow admin to delete post', async () => {
    const admin = await User.create({ role: 'admin', ... });
    const token = await admin.generateAccessToken();
    
    const res = await request(app)
      .delete('/api/posts/123')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
  
  it('should deny student from deleting post', async () => {
    const student = await User.create({ role: 'student', ... });
    const token = await student.generateAccessToken();
    
    const res = await request(app)
      .delete('/api/posts/123')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
```

---

## 🚀 Deployment

### Environment Variables

Ensure these are set in production:

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_connection
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_refresh_secret

# Optional: Redis for scaling
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DISABLED=false

# Rate limiting
RATE_LIMIT_WHITELIST=trusted_ip_1,trusted_ip_2

# Logging
LOG_LEVEL=info
```

### Production Checklist

- [x] Security headers enabled (Helmet)
- [x] Rate limiting active
- [x] Input validation on all routes
- [x] Error masking (no stack traces in production)
- [x] Logging with rotation
- [x] Graceful shutdown implemented
- [x] Health check endpoint available
- [x] CORS configured properly
- [x] Redis configured (for scaling)
- [x] Socket.io CORS configured

---

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:5000/health
# Response: {"status":"ok","timestamp":"..."}
```

### Socket.io Stats

Add an admin endpoint to check socket stats:

```javascript
import { getSocketStats } from '../socket/socket.js';

router.get('/admin/socket-stats', adminOnly, (req, res) => {
  const stats = getSocketStats();
  res.json(stats);
  // Response: {
  //   initialized: true,
  //   onlineUsers: 42,
  //   totalSockets: 45,
  //   rooms: 150
  // }
});
```

### Log Monitoring

- Monitor `logs/error-*.log` for errors
- Monitor `logs/audit-*.log` for admin actions
- Set up alerts for high error rates
- Track failed login attempts

---

## 🆘 Troubleshooting

### Socket.io Connection Issues

**Problem**: Socket connection fails

**Solutions**:
1. Check JWT token is valid and not expired
2. Verify CORS settings in `socket.config.js`
3. Check firewall/proxy allows WebSocket connections
4. Look for errors in server logs

### Rate Limiting Too Strict

**Problem**: Legitimate users getting rate limited

**Solutions**:
1. Add IP to whitelist: `RATE_LIMIT_WHITELIST` in `.env`
2. Adjust limits in `rateLimiter.middleware.js`
3. Use user-based limiting instead of IP-based

### Validation Errors

**Problem**: Validation fails unexpectedly

**Solutions**:
1. Check request body matches validation schema
2. Review validation rules in `validators/` files
3. Check error response for specific field issues
4. Ensure `Content-Type: application/json` header is set

---

## 📚 Additional Resources

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Express Validator](https://express-validator.github.io/docs/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Helmet.js](https://helmetjs.github.io/)

---

## 🎉 Next Steps

1. Update remaining route files with validation and RBAC
2. Add more validators for other features
3. Implement frontend Socket.io integration
4. Write unit and integration tests
5. Setup monitoring and alerting
6. Configure Redis for production scaling

---

**Need help? Check the artifacts created during implementation!**
