/**
 * AllyNet — Full Database Seed Script
 * Drops all collections, seeds clean realistic data.
 * Preserves: rajdhimmar4@gmail.com (Ronit_865), admin@gmail.com (Admin@123)
 *
 * Run: node --experimental-vm-modules src/scripts/seedAll.js
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import dns from 'node:dns';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

/* ─────────────────────────── INLINE SCHEMAS ─────────────────────────── */
const userSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  role: { type: String, default: 'student' },
  avatar: String, graduationYear: Number, course: String,
  currentPosition: String, company: String, location: String,
  phone: String, bio: String, linkedin: String, github: String,
  isVerified: { type: Boolean, default: false },
  refreshToken: String,
  banStatus: { type: String, default: 'active' },
  banReason: String, banExpiresAt: Date, reportCount: { type: Number, default: 0 }
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  avatar: String, role: { type: String, default: 'admin' },
  accessToken: String, refreshToken: String
}, { timestamps: true });

const jobSchema = new mongoose.Schema({
  title: String, description: String, location: String, company: String,
  jobType: { type: String, enum: ['Full-time','Part-time','Contract','Internship'] },
  category: String, experienceRequired: String,
  salary: Number, isVerified: { type: Boolean, default: false },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const eventSchema = new mongoose.Schema({
  title: String, description: String, date: Date, time: String,
  location: String, isactive: { type: Boolean, default: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const donationSchema = new mongoose.Schema({
  name: String, description: String, goal: Number,
  raisedAmount: { type: Number, default: 0 },
  endDate: Date, category: String,
  donors: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number, donatedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  content: String,
  category: { type: String, enum: ['Mentorship','Events','Research','Jobs','Alumni Stories','General'], default: 'General' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  upvotes: { type: Number, default: 0 }, downvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  commentsCount: { type: Number, default: 0 },
  images: [String], isActive: { type: Boolean, default: true }, isPinned: { type: Boolean, default: false },
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  upvotes: { type: Number, default: 0 }, downvotes: { type: Number, default: 0 },
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const connectionSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending','accepted','rejected'], default: 'pending' }
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['connection','comment','upvote','event','reply','mention','general'], default: 'general' },
  title: String, message: String, link: String,
  read: { type: Boolean, default: false }
}, { timestamps: true });

/* ─────────────────────────── MODELS ─────────────────────────── */
const User         = mongoose.model('User',         userSchema);
const Admin        = mongoose.model('Admin',        adminSchema);
const Job          = mongoose.model('Job',          jobSchema);
const Event        = mongoose.model('Event',        eventSchema);
const Donation     = mongoose.model('Donation',     donationSchema);
const Post         = mongoose.model('Post',         postSchema);
const Comment      = mongoose.model('Comment',      commentSchema);
const Connection   = mongoose.model('Connection',   connectionSchema);
const Notification = mongoose.model('Notification', notificationSchema);

/* ─────────────────────────── HELPERS ─────────────────────────── */
const h = (pw) => bcrypt.hash(pw, 10);
const daysAgo  = (n) => new Date(Date.now() - n * 864e5);
const daysAhead = (n) => new Date(Date.now() + n * 864e5);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ─────────────────────────── SEED ─────────────────────────── */
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // ── Drop all collections ──
  const colls = ['users','admins','jobs','events','donations','posts','comments','connections','notifications','conversations','messages','reports','emails'];
  for (const c of colls) {
    try { await mongoose.connection.collection(c).drop(); console.log(`  🗑  dropped ${c}`); }
    catch { /* ignore if doesn't exist */ }
  }
  console.log('✅ All collections dropped\n');

  // ── Admin — goes into BOTH admins AND users collections ──
  // The login controller queries `users` first, so admin MUST be there.
  const adminPw = await h('Admin@123');
  const adminData = {
    name: 'Admin',
    email: 'admin@gmail.com',
    password: adminPw,
    avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Admin&backgroundColor=b6e3f4',
    role: 'admin',
    isVerified: true,
    banStatus: 'active',
    reportCount: 0,
  };
  await Admin.create(adminData);
  await User.create(adminData); // ← login controller queries users
  console.log('✅ Admin created — admin@gmail.com / Admin@123');

  // ── Users ──
  const usersRaw = [
    // Preserved user
    {
      name: 'Ronit Dhimmar', email: 'rajdhimmar4@gmail.com', password: await h('Ronit_865'),
      role: 'alumni', isVerified: true, graduationYear: 2022, course: 'Computer Engineering',
      currentPosition: 'Full Stack Developer', company: 'Google',
      location: 'Bangalore, India', phone: '+918320448948',
      bio: 'Full Stack Developer at Google. Passionate about scalable systems, open source, and mentoring juniors.',
      linkedin: 'https://linkedin.com/in/ronitdhimmar', github: 'https://github.com/ronitdhimmar',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Ronit&backgroundColor=c0aede',
    },
    // Alumni
    {
      name: 'Ananya Sharma', email: 'ananya.sharma@gmail.com', password: await h('Ananya@123'),
      role: 'alumni', isVerified: true, graduationYear: 2021, course: 'Information Technology',
      currentPosition: 'Data Scientist', company: 'Microsoft',
      location: 'Hyderabad, India', phone: '+919876543210',
      bio: 'Data Scientist at Microsoft. Working on NLP and large-scale recommendation systems.',
      linkedin: 'https://linkedin.com/in/ananyasharma',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Ananya&backgroundColor=ffdfbf',
    },
    {
      name: 'Karan Mehta', email: 'karan.mehta@gmail.com', password: await h('Karan@123'),
      role: 'alumni', isVerified: true, graduationYear: 2020, course: 'Electronics & Communication',
      currentPosition: 'Product Manager', company: 'Flipkart',
      location: 'Pune, India', phone: '+919988776655',
      bio: 'Product Manager at Flipkart. Obsessed with user experience and 0-to-1 products.',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Karan&backgroundColor=d1f7c4',
    },
    {
      name: 'Priya Nair', email: 'priya.nair@gmail.com', password: await h('Priya@123'),
      role: 'alumni', isVerified: true, graduationYear: 2021, course: 'Computer Science',
      currentPosition: 'ML Engineer', company: 'Amazon',
      location: 'Chennai, India', phone: '+919123456789',
      bio: 'ML Engineer at Amazon. Working on fraud detection and real-time ranking systems.',
      linkedin: 'https://linkedin.com/in/priyanair',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Priya&backgroundColor=ffd6e0',
    },
    {
      name: 'Vikram Patel', email: 'vikram.patel@gmail.com', password: await h('Vikram@123'),
      role: 'alumni', isVerified: true, graduationYear: 2019, course: 'Mechanical Engineering',
      currentPosition: 'Business Analyst', company: 'Deloitte',
      location: 'Mumbai, India', phone: '+917654321098',
      bio: 'Business Analyst at Deloitte. Bridging the gap between tech and business.',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Vikram&backgroundColor=c3e6cb',
    },
    {
      name: 'Sneha Kulkarni', email: 'sneha.kulkarni@gmail.com', password: await h('Sneha@123'),
      role: 'alumni', isVerified: true, graduationYear: 2022, course: 'Computer Engineering',
      currentPosition: 'Software Engineer II', company: 'Razorpay',
      location: 'Bangalore, India', phone: '+919845612378',
      bio: 'Building payment infra at Razorpay. Into distributed systems and Go.',
      github: 'https://github.com/snehak',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Sneha&backgroundColor=b6e3f4',
    },
    {
      name: 'Arjun Reddy', email: 'arjun.reddy@gmail.com', password: await h('Arjun@123'),
      role: 'alumni', isVerified: true, graduationYear: 2020, course: 'Information Technology',
      currentPosition: 'DevOps Engineer', company: 'Infosys',
      location: 'Hyderabad, India', phone: '+918765432109',
      bio: 'DevOps Engineer at Infosys. Kubernetes, Terraform, and CI/CD pipelines are my bread and butter.',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Arjun&backgroundColor=ffdcb8',
    },
    {
      name: 'Meera Joshi', email: 'meera.joshi@gmail.com', password: await h('Meera@123'),
      role: 'alumni', isVerified: true, graduationYear: 2023, course: 'Computer Science',
      currentPosition: 'Frontend Engineer', company: 'Swiggy',
      location: 'Bangalore, India', phone: '+919012345678',
      bio: 'Frontend Engineer at Swiggy. React, TypeScript, and design systems enthusiast.',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Meera&backgroundColor=d0bfff',
    },
    // Students
    {
      name: 'Rahul Gupta', email: 'rahul.gupta@gmail.com', password: await h('Rahul@123'),
      role: 'student', isVerified: false, graduationYear: 2026, course: 'Computer Engineering',
      location: 'Ahmedabad, India', phone: '+917012345678',
      bio: 'Final year CE student. Interested in backend development and system design.',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Rahul&backgroundColor=c0e8ff',
    },
    {
      name: 'Ishaan Chopra', email: 'ishaan.chopra@gmail.com', password: await h('Ishaan@123'),
      role: 'student', isVerified: false, graduationYear: 2025, course: 'Electronics & Communication',
      location: 'Jaipur, India', phone: '+917654098765',
      bio: 'ECE student with a love for embedded systems and IoT projects.',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Ishaan&backgroundColor=c8f7c5',
    },
    {
      name: 'Tanvi Shah', email: 'tanvi.shah@gmail.com', password: await h('Tanvi@123'),
      role: 'student', isVerified: false, graduationYear: 2026, course: 'Information Technology',
      location: 'Surat, India', phone: '+919988001122',
      bio: 'IT student passionate about UI/UX and mobile app development.',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Tanvi&backgroundColor=ffd6e0',
    },
    {
      name: 'Rohan Das', email: 'rohan.das@gmail.com', password: await h('Rohan@123'),
      role: 'student', isVerified: false, graduationYear: 2025, course: 'Computer Science',
      location: 'Kolkata, India', phone: '+918001234567',
      bio: 'CS student exploring machine learning and data visualization.',
      avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=Rohan&backgroundColor=ffe0b2',
    },
  ];

  const users = await User.insertMany(usersRaw);
  console.log(`✅ ${users.length} users created`);

  // Map email → user document
  const byEmail = {};
  for (const u of users) byEmail[u.email] = u;
  const ronit    = byEmail['rajdhimmar4@gmail.com'];
  const ananya   = byEmail['ananya.sharma@gmail.com'];
  const karan    = byEmail['karan.mehta@gmail.com'];
  const priya    = byEmail['priya.nair@gmail.com'];
  const vikram   = byEmail['vikram.patel@gmail.com'];
  const sneha    = byEmail['sneha.kulkarni@gmail.com'];
  const arjun    = byEmail['arjun.reddy@gmail.com'];
  const meera    = byEmail['meera.joshi@gmail.com'];
  const rahul    = byEmail['rahul.gupta@gmail.com'];
  const ishaan   = byEmail['ishaan.chopra@gmail.com'];
  const tanvi    = byEmail['tanvi.shah@gmail.com'];
  const rohan    = byEmail['rohan.das@gmail.com'];

  // ── Jobs ──
  const jobsData = [
    {
      title: 'Senior Software Engineer',
      description: 'Join our core platform team to build and scale distributed systems serving 300M+ users. You will architect, build and own features across our entire stack.\n\nResponsibilities:\n• Design and implement high-availability backend services\n• Lead technical design reviews and code reviews\n• Mentor junior engineers\n• Drive engineering best practices',
      location: 'Bangalore, India', company: 'Google', jobType: 'Full-time',
      category: 'Software Engineering', experienceRequired: '3-5 years',
      salary: 2800000, isVerified: true, postedBy: ronit._id,
      applicants: [rahul._id, ishaan._id]
    },
    {
      title: 'Data Scientist - NLP',
      description: 'Work on cutting-edge NLP models for understanding customer intent and powering our recommendation engine.\n\nYou will:\n• Build and deploy ML models at scale\n• Collaborate with product and engineering teams\n• Run A/B experiments and analyze results\n• Publish internal research',
      location: 'Hyderabad, India (Remote OK)', company: 'Microsoft', jobType: 'Full-time',
      category: 'Data Science', experienceRequired: '2-4 years',
      salary: 2400000, isVerified: true, postedBy: ananya._id,
      applicants: [rohan._id, tanvi._id]
    },
    {
      title: 'Product Manager - Payments',
      description: 'Drive the vision and execution for Flipkart Pay, our payments platform processing ₹1B+ in daily GMV.\n\nRequirements:\n• Strong analytical skills\n• Experience with payments or fintech\n• Excellent stakeholder management\n• Prior PM experience preferred',
      location: 'Bangalore, India', company: 'Flipkart', jobType: 'Full-time',
      category: 'Product Management', experienceRequired: '3-6 years',
      salary: 3200000, isVerified: true, postedBy: karan._id,
      applicants: [rahul._id]
    },
    {
      title: 'Frontend Engineer - React',
      description: 'Build beautiful, performant UIs for millions of customers. You will own front-end architecture for our ordering and checkout flows.\n\nSkills: React, TypeScript, Webpack/Vite, GraphQL, Design Systems',
      location: 'Bangalore, India', company: 'Swiggy', jobType: 'Full-time',
      category: 'Software Engineering', experienceRequired: '1-3 years',
      salary: 1800000, isVerified: true, postedBy: meera._id,
      applicants: [tanvi._id, rohan._id, ishaan._id]
    },
    {
      title: 'DevOps / Platform Engineer',
      description: 'Join our infrastructure team to build the platform that powers all of Infosys cloud delivery.\n\nStack: AWS, Kubernetes, Terraform, ArgoCD, Prometheus, Grafana\n\nYou will manage multi-region clusters, on-call rotations, and SRE practices.',
      location: 'Hyderabad, India', company: 'Infosys', jobType: 'Full-time',
      category: 'DevOps / Cloud', experienceRequired: '2-4 years',
      salary: 1600000, isVerified: true, postedBy: arjun._id,
      applicants: [rahul._id, rohan._id]
    },
    {
      title: 'ML Engineer - Fraud Detection',
      description: 'Work on Amazon\'s fraud detection systems that protect millions of transactions daily. You will train and deploy real-time ML models.\n\nRequirements:\n• Strong Python and ML fundamentals\n• Experience with streaming systems (Kafka, Flink)\n• Knowledge of feature engineering',
      location: 'Chennai, India', company: 'Amazon', jobType: 'Full-time',
      category: 'Machine Learning', experienceRequired: '2-5 years',
      salary: 2600000, isVerified: true, postedBy: priya._id,
      applicants: [rohan._id]
    },
    {
      title: 'Business Analyst - Technology Consulting',
      description: 'Join Deloitte\'s Technology practice to help Fortune 500 clients transform their business with tech.\n\nYou will gather requirements, run workshops, and deliver client presentations.',
      location: 'Mumbai, India', company: 'Deloitte', jobType: 'Full-time',
      category: 'Consulting', experienceRequired: '0-2 years',
      salary: 900000, isVerified: true, postedBy: vikram._id,
      applicants: [tanvi._id]
    },
    {
      title: 'Backend Intern - Payments',
      description: 'Build features for Razorpay\'s core payment APIs. You\'ll write real code that processes millions of transactions.\n\nLanguages: Go, Python\nDuration: 6 months, PPO available',
      location: 'Bangalore, India', company: 'Razorpay', jobType: 'Internship',
      category: 'Software Engineering', experienceRequired: 'Fresher',
      salary: 80000, isVerified: true, postedBy: sneha._id,
      applicants: [rahul._id, ishaan._id, tanvi._id, rohan._id]
    },
  ];

  const jobs = await Job.insertMany(jobsData);
  console.log(`✅ ${jobs.length} jobs created`);

  // ── Events ──
  const now = new Date();
  const eventsData = [
    {
      title: 'Alumni Reunion 2025 — The Grand Homecoming',
      description: 'Join us for AllyNet\'s biggest annual alumni gathering. Meet old friends, build new connections, enjoy panel talks from industry leaders, and celebrate our shared journey. Food, music, and nostalgia included.\n\nAgenda:\n• 4:00 PM — Registration & Networking\n• 5:00 PM — Welcome address by Director\n• 6:00 PM — Panel: "Industry Leaders on AI & the Future"\n• 8:00 PM — Alumni Awards Ceremony\n• 9:00 PM — Dinner & Live music',
      date: daysAhead(21), time: '4:00 PM',
      location: 'LDRP Convention Hall, Gandhinagar',
      isactive: true, participants: [ronit._id, ananya._id, karan._id, priya._id, sneha._id]
    },
    {
      title: 'Hackathon: Build for Bharat 3.0',
      description: 'A 36-hour hackathon focused on solving real problems in rural healthcare, education, and fintech. Open to all students and alumni.\n\nPrize pool: ₹2,00,000\nTeam size: 2-4 members\nThemes: AgriTech, EdTech, HealthTech, FinTech\n\nRegister now — limited slots!',
      date: daysAhead(14), time: '9:00 AM',
      location: 'KD Campus, Gandhinagar (Hybrid)',
      isactive: true, participants: [rahul._id, ishaan._id, tanvi._id, rohan._id, meera._id, sneha._id]
    },
    {
      title: 'Placement Prep Bootcamp — SDE Track',
      description: 'Intensive 2-day bootcamp covering Data Structures, Algorithms, System Design, and Mock Interviews. Led by alumni from Google, Amazon, and Microsoft.\n\nDay 1: DSA Deep Dive (Arrays, Trees, Graphs, DP)\nDay 2: System Design + HR Interview Prep + Mock interviews',
      date: daysAhead(7), time: '9:30 AM',
      location: 'Online (Zoom)',
      isactive: true, participants: [rahul._id, ishaan._id, rohan._id, tanvi._id]
    },
    {
      title: 'Fireside Chat: From Campus to FAANG',
      description: 'Ronit Dhimmar (Google) and Priya Nair (Amazon) share their journey from LDRP to FAANG — what actually works in interviews, how to build projects that matter, and life beyond college.\n\nInformal, candid, Q&A-heavy. Bring your questions.',
      date: daysAhead(5), time: '6:00 PM',
      location: 'Online (Google Meet)',
      isactive: true, participants: [ronit._id, priya._id, rahul._id, ishaan._id, tanvi._id, rohan._id]
    },
    {
      title: 'Startup Pitch Night — Demo Day',
      description: 'Watch 8 alumni-led startups pitch live to a panel of VCs and investors. Network with founders, investors, and fellow alumni.\n\nIndustries: SaaS, D2C, HealthTech, ClimaTech\n\nPost-event networking dinner for all attendees.',
      date: daysAhead(35), time: '5:30 PM',
      location: 'GCCI Conference Centre, Ahmedabad',
      isactive: true, participants: [ronit._id, karan._id, vikram._id, sneha._id]
    },
    // Past events
    {
      title: 'Workshop: Docker & Kubernetes for Beginners',
      description: 'Hands-on workshop covering containerization fundamentals. Participants set up a local K8s cluster and deployed a microservices app.',
      date: daysAgo(30), time: '10:00 AM',
      location: 'Online',
      isactive: false, participants: [rahul._id, arjun._id, rohan._id]
    },
    {
      title: 'Annual Sports Fest — AllyNet League',
      description: 'Cricket, badminton, chess, and carrom tournaments for alumni and students. A fun day to unwind and bond.',
      date: daysAgo(60), time: '8:00 AM',
      location: 'LDRP Sports Ground, Gandhinagar',
      isactive: false, participants: [ronit._id, karan._id, arjun._id, vikram._id, rahul._id, ishaan._id]
    },
  ];

  const events = await Event.insertMany(eventsData);
  console.log(`✅ ${events.length} events created`);

  // ── Donations ──
  const donationsData = [
    {
      name: 'Campus Infrastructure Fund',
      description: 'Help us upgrade the college computer labs with modern hardware, high-speed internet, and collaborative workspaces for students.',
      goal: 1000000, endDate: daysAhead(90), category: 'Infrastructure',
      raisedAmount: 0,
      donors: [
        { userId: ronit._id, amount: 50000, donatedAt: daysAgo(10) },
        { userId: ananya._id, amount: 25000, donatedAt: daysAgo(8) },
        { userId: karan._id, amount: 15000, donatedAt: daysAgo(5) },
        { userId: priya._id, amount: 20000, donatedAt: daysAgo(3) },
        { userId: vikram._id, amount: 10000, donatedAt: daysAgo(2) },
        { userId: sneha._id, amount: 30000, donatedAt: daysAgo(1) },
      ]
    },
    {
      name: 'Need-Based Student Scholarships 2025',
      description: 'Fund scholarships for deserving students from financially weaker backgrounds. Every ₹5,000 covers one month of a student\'s hostel and mess expenses.',
      goal: 500000, endDate: daysAhead(60), category: 'Scholarship',
      raisedAmount: 0,
      donors: [
        { userId: ronit._id, amount: 20000, donatedAt: daysAgo(15) },
        { userId: priya._id, amount: 10000, donatedAt: daysAgo(12) },
        { userId: meera._id, amount: 5000, donatedAt: daysAgo(6) },
        { userId: arjun._id, amount: 7500, donatedAt: daysAgo(4) },
      ]
    },
    {
      name: 'Annual Technical Fest Sponsorship',
      description: 'Help make Technovanza 2025 bigger and better — sponsor workshops, hackathons, guest speaker series, and the prize pool.',
      goal: 200000, endDate: daysAhead(45), category: 'Events',
      raisedAmount: 0,
      donors: [
        { userId: karan._id, amount: 15000, donatedAt: daysAgo(20) },
        { userId: sneha._id, amount: 8000, donatedAt: daysAgo(14) },
        { userId: vikram._id, amount: 12000, donatedAt: daysAgo(9) },
        { userId: ananya._id, amount: 5000, donatedAt: daysAgo(7) },
        { userId: arjun._id, amount: 6000, donatedAt: daysAgo(3) },
        { userId: ronit._id, amount: 10000, donatedAt: daysAgo(1) },
      ]
    },
    {
      name: 'Alumni Research Grant',
      description: 'Support student and alumni research projects in AI, renewable energy, and healthcare. Grants of ₹25,000–₹1,00,000 awarded quarterly.',
      goal: 750000, endDate: daysAhead(120), category: 'Research',
      raisedAmount: 0,
      donors: [
        { userId: ronit._id, amount: 75000, donatedAt: daysAgo(30) },
        { userId: ananya._id, amount: 50000, donatedAt: daysAgo(25) },
        { userId: priya._id, amount: 40000, donatedAt: daysAgo(20) },
        { userId: meera._id, amount: 20000, donatedAt: daysAgo(10) },
      ]
    },
    // Completed campaign
    {
      name: 'Library Digital Transformation',
      description: 'Digitized the college library with e-book subscriptions, IEEE/ACM journal access, and a modern catalog system. Campaign successfully completed!',
      goal: 150000, endDate: daysAgo(10), category: 'Infrastructure',
      raisedAmount: 0,
      donors: [
        { userId: ronit._id, amount: 40000, donatedAt: daysAgo(60) },
        { userId: karan._id, amount: 30000, donatedAt: daysAgo(55) },
        { userId: vikram._id, amount: 25000, donatedAt: daysAgo(50) },
        { userId: ananya._id, amount: 20000, donatedAt: daysAgo(45) },
        { userId: sneha._id, amount: 20000, donatedAt: daysAgo(40) },
        { userId: arjun._id, amount: 15000, donatedAt: daysAgo(30) },
      ]
    },
  ];

  // Calculate raisedAmount from donors
  for (const d of donationsData) {
    d.raisedAmount = d.donors.reduce((s, don) => s + don.amount, 0);
  }

  const donations = await Donation.insertMany(donationsData);
  console.log(`✅ ${donations.length} donation campaigns created`);

  // ── Community Posts ──
  const postsData = [
    {
      content: 'Just got my offer from Google! 🎉 Honestly couldn\'t have done it without this community. The mock interviews with alumni here were game-changing. For anyone prepping — focus on fundamentals over grinding LeetCode blindly. Happy to help anyone with system design prep!',
      category: 'Alumni Stories', author: ronit._id,
      upvotes: 47, upvotedBy: [ananya._id, karan._id, priya._id, sneha._id, rahul._id, ishaan._id],
      commentsCount: 8, isPinned: true
    },
    {
      content: 'Sharing my notes from the Placement Bootcamp last week. Covered Trees, Graphs, Dynamic Programming, and the classic System Design interview format. DM me if you want the full PDF — includes practice problems and my own annotations from FAANG rounds.\n\n#placement #systemdesign #DSA',
      category: 'Mentorship', author: ananya._id,
      upvotes: 32, upvotedBy: [ronit._id, priya._id, rahul._id, rohan._id, tanvi._id],
      commentsCount: 5
    },
    {
      content: 'Hot take: Most students over-optimize for DSA and under-invest in communication skills. At Amazon, I\'ve seen brilliant engineers fail onsite rounds purely because they couldn\'t articulate their thought process. Practice "thinking out loud" as much as you practice code.\n\nTried doing mock interviews with a friend last weekend — transformed how I approach problem-solving.',
      category: 'Mentorship', author: priya._id,
      upvotes: 28, upvotedBy: [ronit._id, ananya._id, karan._id, vikram._id, rahul._id],
      commentsCount: 12
    },
    {
      content: 'Reminder: Hackathon "Build for Bharat 3.0" is in 2 weeks! 🚀\n\nTeam-finding thread — drop your skills below and find teammates:\n• I\'m looking for a UI/UX person and a backend dev\n• My stack: React, Node.js\n• Theme preference: HealthTech\n\nWho\'s in?',
      category: 'Events', author: sneha._id,
      upvotes: 19, upvotedBy: [rahul._id, ishaan._id, tanvi._id, rohan._id],
      commentsCount: 6
    },
    {
      content: 'The job market for freshers is rough right now, no point sugarcoating it. But here\'s what I\'ve seen work:\n\n1. Projects > internships on resume for freshers\n2. Contribute to open source — even small PRs stand out\n3. Network before you need it. Alumni connections have closed more job loops than portals ever will\n4. Cold email works. I hired 2 people last year from cold emails that were thoughtful and specific\n\nHang in there 💪',
      category: 'Jobs', author: karan._id,
      upvotes: 54, upvotedBy: [ronit._id, ananya._id, priya._id, sneha._id, arjun._id, rahul._id, ishaan._id, rohan._id, tanvi._id],
      commentsCount: 14
    },
    {
      content: 'Research opportunity: I\'m looking for 1-2 students to co-author a paper on "Privacy-Preserving ML for Healthcare" with me. We\'ll be submitting to NeurIPS 2025 workshop track.\n\nRequirements:\n• Strong Python / PyTorch\n• Familiarity with federated learning (helpful but not required)\n• Commitment to 6-8 hrs/week for 3 months\n\nReach out by Nov 15. Serious inquiries only.',
      category: 'Research', author: ananya._id,
      upvotes: 21, upvotedBy: [ronit._id, priya._id, rohan._id, tanvi._id],
      commentsCount: 3
    },
    {
      content: 'Quick tip that changed my productivity: I started treating my first 90 minutes of work as "deep work" — phone off, no Slack, no meetings. Just code or writing.\n\nOutput doubled in 3 weeks. YMMV but worth trying for one week.',
      category: 'General', author: arjun._id,
      upvotes: 15, upvotedBy: [ronit._id, sneha._id, meera._id],
      commentsCount: 2
    },
    {
      content: 'Study group forming for GATE 2026! 🎓\n\nLooking for serious students to meet twice a week (online). Plan is to cover all core subjects systematically over 8 months. Using NPTEL lectures + previous year papers.\n\nDM if interested. Target: AIR < 500',
      category: 'General', author: rohan._id,
      upvotes: 11, upvotedBy: [ishaan._id, tanvi._id],
      commentsCount: 4
    },
  ];

  const posts = await Post.insertMany(postsData);
  console.log(`✅ ${posts.length} community posts created`);

  // ── Comments ──
  const commentsData = [
    { content: 'Huge congratulations! You deserved it. Loved working through those system design problems with you.', author: ananya._id, post: posts[0]._id, upvotes: 5 },
    { content: 'This is so inspiring. Currently in my 3rd year and this gives me hope. Would love to connect!', author: rahul._id, post: posts[0]._id, upvotes: 3 },
    { content: 'Massive! What rounds did you face at Google? Was it the usual 5-round format?', author: ishaan._id, post: posts[0]._id, upvotes: 2 },
    { content: 'Thanks Ronit! The mock interview session was the best prep I did. Hoping to share a similar post soon 🤞', author: tanvi._id, post: posts[0]._id, upvotes: 4 },
    { content: 'This is gold. Please share the PDF — DM sent!', author: rohan._id, post: posts[1]._id, upvotes: 3 },
    { content: 'Thank you so much Ananya! The DP section is exactly what I struggle with.', author: rahul._id, post: posts[1]._id, upvotes: 2 },
    { content: '100% this. My communication skills were terrible when I first started prepping. Toastmasters actually helped me a lot alongside interview prep.', author: karan._id, post: posts[2]._id, upvotes: 8 },
    { content: 'Agreed. I always think out loud now even when solving alone — helps spot mistakes early too.', author: sneha._id, post: posts[2]._id, upvotes: 5 },
    { content: 'Interested! I do React Native + Django. Happy to join your team 👋', author: ishaan._id, post: posts[3]._id, upvotes: 3 },
    { content: 'Point 4 is underrated. My current job came from a cold email to an alumnus. Took 3 weeks but it worked.', author: sneha._id, post: posts[4]._id, upvotes: 12 },
    { content: 'For open source, I\'d add: look for "good first issue" labels. GitHub has an explore section specifically for this.', author: meera._id, post: posts[4]._id, upvotes: 9 },
    { content: 'Interested in the federated learning project! Sending you a DM with my background.', author: rohan._id, post: posts[5]._id, upvotes: 1 },
  ];

  await Comment.insertMany(commentsData);
  console.log(`✅ ${commentsData.length} comments created`);

  // ── Connections ──
  const connectionsData = [
    { requester: ronit._id, recipient: ananya._id, status: 'accepted' },
    { requester: ronit._id, recipient: karan._id, status: 'accepted' },
    { requester: ronit._id, recipient: priya._id, status: 'accepted' },
    { requester: ronit._id, recipient: sneha._id, status: 'accepted' },
    { requester: ronit._id, recipient: meera._id, status: 'accepted' },
    { requester: ananya._id, recipient: priya._id, status: 'accepted' },
    { requester: ananya._id, recipient: arjun._id, status: 'accepted' },
    { requester: karan._id, recipient: vikram._id, status: 'accepted' },
    { requester: sneha._id, recipient: arjun._id, status: 'accepted' },
    { requester: rahul._id, recipient: ronit._id, status: 'accepted' },
    { requester: rahul._id, recipient: ananya._id, status: 'accepted' },
    { requester: ishaan._id, recipient: arjun._id, status: 'accepted' },
    { requester: tanvi._id, recipient: meera._id, status: 'accepted' },
    { requester: rohan._id, recipient: priya._id, status: 'accepted' },
    // Pending
    { requester: ishaan._id, recipient: ronit._id, status: 'pending' },
    { requester: tanvi._id, recipient: ananya._id, status: 'pending' },
    { requester: rohan._id, recipient: sneha._id, status: 'pending' },
  ];

  await Connection.insertMany(connectionsData);
  console.log(`✅ ${connectionsData.length} connections created`);

  // ── Notifications for Ronit ──
  const notificationsData = [
    {
      recipient: ronit._id, sender: rahul._id, type: 'connection',
      title: 'Connection request', message: 'Rahul Gupta sent you a connection request',
      link: '/connections', read: false
    },
    {
      recipient: ronit._id, sender: ananya._id, type: 'comment',
      title: 'New comment', message: 'Ananya Sharma commented on your post: "Huge congratulations! You deserved it."',
      link: '/communications', read: false
    },
    {
      recipient: ronit._id, sender: priya._id, type: 'upvote',
      title: 'Post upvoted', message: 'Priya Nair and 5 others upvoted your post',
      link: '/communications', read: true
    },
    {
      recipient: ronit._id, sender: null, type: 'event',
      title: 'Event reminder', message: 'Alumni Reunion 2025 is coming up in 21 days!',
      link: '/events', read: false
    },
  ];

  await Notification.insertMany(notificationsData);
  console.log(`✅ ${notificationsData.length} notifications created`);

  // ── Summary ──
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Database seeded successfully!\n');
  console.log('👤 Admin:          admin@gmail.com      / Admin@123');
  console.log('👤 Preserved user: rajdhimmar4@gmail.com / Ronit_865');
  console.log('👥 Alumni users:   8 (all pass: Name@123)');
  console.log('👥 Student users:  4 (all pass: Name@123)');
  console.log(`💼 Jobs:           ${jobs.length}`);
  console.log(`📅 Events:         ${events.length} (5 upcoming, 2 past)`);
  console.log(`❤️  Donations:      ${donations.length} campaigns`);
  console.log(`💬 Posts:          ${posts.length}`);
  console.log(`🔗 Connections:    ${connectionsData.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
