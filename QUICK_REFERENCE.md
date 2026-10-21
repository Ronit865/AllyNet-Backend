# 🚀 AllyNet Backend - Quick Reference Card

## 📋 Common Imports

```javascript
// Middleware
import { verifyJWT, verifyUserOrAdmin } from './middlewares/auth.middleware.js';
import { requireRole, requirePermission, adminOnly } from './middlewares/rbac.middleware.js';
import { requireNotBanned, canCreateContent } from './middlewares/banCheck.middleware.js';
import { validate } from './middlewares/validation.middleware.js';
import { authLimiter, messageLimiter, adminLimiter } from './middlewares/rateLimiter.middleware.js';

// Config
import { PERMISSIONS, ROLES } from './config/permissions.config.js';

// Logging
import logger, { logAudit, logSecurity } from './config/winston.config.js';

// Socket
import { emitNewMessage, emitNewNotification, forceDisconnectUser } from './services/socket.service.js';
```

---

## 🛣️ Route Template

```javascript
import express from 'express';
import { controller } from '../controllers/feature.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { requireNotBanned } from '../middlewares/banCheck.middleware.js';
import { generalLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { validation } from '../validators/feature.validator.js';
import { PERMISSIONS } from '../config/permissions.config.js';

const router = express.Router();

router.post('/',
  verifyJWT,                              // Auth required
  requireNotBanned,                       // Check ban status
  requirePermission(PERMISSIONS.ACTION),  // Check permission
  generalLimiter,                         // Rate limit
  validation,                             // Validation rules
  validate,                               // Process validation
  controller                              // Controller function
);

export default router;
```

---

## 🔐 RBAC Quick Reference

### Roles (High to Low)
```
superadmin > admin > moderator > alumni > student
```

### Common Permissions
```javascript
PERMISSIONS.USER_READ           // View users
PERMISSIONS.USER_UPDATE         // Update any user
PERMISSIONS.USER_UPDATE_OWN     // Update own profile
PERMISSIONS.USER_BAN            // Ban users
PERMISSIONS.POST_CREATE         // Create posts
PERMISSIONS.POST_DELETE         // Delete any post
PERMISSIONS.POST_DELETE_OWN     // Delete own post
PERMISSIONS.MESSAGE_SEND        // Send messages
```

### Middleware Usage
```javascript
// Single role
requireRole(['admin'])

// Multiple roles
requireRole(['admin', 'moderator'])

// Single permission
requirePermission(PERMISSIONS.USER_BAN)

// Convenience
adminOnly              // admin, superadmin, moderator
superadminOnly         // superadmin only
moderatorOrHigher      // moderator, admin, superadmin
```

---

## 🚦 Rate Limits

```javascript
authLimiter           // 10 req/min  - Login, register
messageLimiter        // 50 req/min  - Messages
adminLimiter          // 200 req/15min - Admin routes
uploadLimiter         // 20 req/hour - File uploads
emailLimiter          // 5 req/hour  - Email/OTP
postCreationLimiter   // 30 req/hour - Post creation
commentCreationLimiter // 60 req/hour - Comments
generalLimiter        // 100 req/15min - General API
```

---

## ✅ Validation Template

```javascript
// In validators/feature.validator.js
import { body, param, query } from 'express-validator';

export const createValidation = [
  body('field')
    .notEmpty()
    .withMessage('Field is required')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Must be 3-50 characters'),
  
  param('id')
    .custom(isValidObjectId)
    .withMessage('Invalid ID format')
];
```

---

## 📝 Logging Quick Reference

```javascript
// General logging
logger.info('Message', { userId, action });
logger.warn('Warning message');
logger.error('Error message', { error: err.message });
logger.debug('Debug info', { data });

// Audit logging (admin actions)
logAudit('ACTION_NAME', admin, { type: 'user', id: userId }, { reason });

// Security logging
logSecurity('Security event', { ip, userId, severity: 'high' });

// Error logging
try {
  // code
} catch (error) {
  logError(error, { userId, action: 'create_post' });
}
```

---

## ⚡ Socket.io Quick Reference

### Frontend Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: jwtToken }
});

socket.on('connect', () => console.log('Connected'));
socket.on('message:new', (data) => handleMessage(data));
```

### Backend Emitting
```javascript
// In controller
import { emitNewMessage, emitNewNotification } from '../services/socket.service.js';

// After DB operation
emitNewMessage(recipientId, { message, conversationId });
emitNewNotification(userId, { type, message });
```

### Socket Events

**Incoming (Client → Server):**
```
message:send              // Send message
typing:start              // Start typing
typing:stop               // Stop typing
message:read              // Mark as read
room:join                 // Join conversation
presence:request          // Get online status
```

**Outgoing (Server → Client):**
```
message:new               // New message received
typing:indicator          // Typing status
notification:new          // New notification
user:online               // User came online
user:offline              // User went offline
presence:update           // Presence changed
```

---

## 🚫 Ban System

### Checking Bans
```javascript
// In routes
router.post('/post',
  requireNotBanned,      // Block all banned users
  canCreateContent,      // Block content creation for banned
  createPost
);
```

### Banning User
```javascript
// In controller
const user = await User.findById(userId);
user.banStatus = 'temp_banned'; // or 'suspended'
user.banReason = 'Reason here';
user.banExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
await user.save();

// Force disconnect
await forceDisconnectUser(userId, 'Account banned');

// Log action
logAudit('USER_BANNED', req.admin, { type: 'user', id: userId });
```

---

## 🔧 Controller Template

```javascript
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/winston.config.js';
import { emitNewNotification } from '../services/socket.service.js';

export const controllerName = asyncHandler(async (req, res) => {
  // 1. Extract data
  const { field } = req.body;
  const userId = req.user._id;
  
  // 2. Validation (if not done by middleware)
  if (!field) {
    throw new ApiError(400, 'Field is required');
  }
  
  // 3. Business logic
  const result = await Model.create({ field, userId });
  
  // 4. Emit socket event (if needed)
  emitNewNotification(userId, { type: 'action', message: 'Success' });
  
  // 5. Log action
  logger.info('Action completed', { userId, resultId: result._id });
  
  // 6. Return response
  res.status(201).json(
    new ApiResponse(201, result, 'Action completed successfully')
  );
});
```

---

## 🧪 Testing Checklist

### Manual Testing
```bash
# Test login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Test with auth
curl -X GET http://localhost:5000/api/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test rate limiting (run 11 times quickly)
for i in {1..11}; do curl http://localhost:5000/api/endpoint; done

# Test Socket.io
# Use browser console:
const socket = io('http://localhost:5000', { auth: { token: 'TOKEN' } });
socket.on('connect', () => console.log('OK'));
```

---

## 📊 Environment Variables

```env
# Required
PORT=5000
MONGODB_URI=your_mongodb_uri
ACCESS_TOKEN_SECRET=your_secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=your_refresh_secret
REFRESH_TOKEN_EXPIRY=7d

# Optional
NODE_ENV=development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DISABLED=true
LOG_LEVEL=debug
RATE_LIMIT_WHITELIST=127.0.0.1
```

---

## 🐛 Common Issues & Fixes

### Socket.io not connecting
```javascript
// Check:
1. JWT token is valid
2. CORS settings include your origin
3. WebSocket not blocked by firewall
4. Token passed in auth.token not auth.authorization
```

### Validation fails unexpectedly
```javascript
// Check:
1. Request Content-Type is application/json
2. Field names match validation schema
3. Data types match (string vs number)
4. Check error response for specific field issues
```

### Rate limit too strict
```javascript
// Solutions:
1. Add IP to whitelist in .env
2. Adjust limits in rateLimiter.middleware.js
3. Use user-based limiting (requires auth)
```

### Ban not working
```javascript
// Check:
1. requireNotBanned middleware is applied
2. User banStatus field is set correctly
3. banExpiresAt is in future for temp bans
4. User role is not admin/superadmin (exempt)
```

---

## 📞 Quick Commands

```bash
# Start server
npm start

# Check syntax
node --check src/file.js

# View logs (Windows PowerShell)
Get-Content logs/all-*.log -Tail 50 -Wait

# Check health
curl http://localhost:5000/health

# Clear logs (be careful!)
Remove-Item logs/*.log
```

---

## 🎯 Next Steps

1. **Update Routes**: Add validation to remaining routes
2. **Frontend**: Integrate Socket.io client
3. **Testing**: Write unit and integration tests
4. **Redis**: Setup Redis for production scaling
5. **Monitoring**: Setup log aggregation and alerts

---

## 📚 File Locations

```
Configuration:    src/config/
Middleware:       src/middlewares/
Validators:       src/validators/
Socket.io:        src/socket/
Services:         src/services/
Routes:           src/routes/
Controllers:      src/controllers/
Models:           src/models/
Logs:             logs/
```

---

## 🔗 Helpful Links

- Full Guide: `IMPLEMENTATION_GUIDE.md`
- Artifacts: Created during implementation
- Socket Events: `src/config/socket.config.js`
- Permissions: `src/config/permissions.config.js`

---

**Keep this card handy for quick reference! 📌**
