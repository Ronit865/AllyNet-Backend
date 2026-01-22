import express from 'express';
import cors from 'cors';   
import cookieParser from 'cookie-parser';

const app = express();

//Basic middleware
app.use(cors({
  origin: ['https://allynet-app.vercel.app','http://localhost:5173','https://allynet.lovable.app'], 
  credentials: true, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Set-Cookie', 'Cookie', 'X-Requested-With'],
}));

app.use(express.json({limit:"50mb"}));  //limit incoming data
app.use(express.urlencoded({extended:true, limit:"50mb"}));  // used for parsing incoming form data 
app.use(express.static('public'))  //sets files in public as static
app.use(cookieParser()) //used for cookie reading


//Routes
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

export default app;